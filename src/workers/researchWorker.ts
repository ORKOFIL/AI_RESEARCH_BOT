import path from 'path';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { END, START, StateGraph, Annotation, MessagesAnnotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { SystemMessage, HumanMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { tvly } from '@/lib/tavilyClient';
import * as z from "zod";
import axios from 'axios';
import { RestoreOriginalFunction } from 'next/dist/build/turborepo-access-trace/types';
import { googleSearchWorker } from '@/services/ai/planner'
const YOUR_SEARCHAPI_KEY = process.env.YOUR_SEARCHAPI_KEY;
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });


import { PlaywrightCrawler, Configuration } from "crawlee";
Configuration.getGlobalConfig().set("persistStorage", false);

let oldMarkdown = ""
async function scrapePage(url: string, newie: boolean): Promise<string> {
    let cleanMarkdown = "";

    // 1. Вимикаємо збереження файлів у storage через глобальний конфіг
    Configuration.getGlobalConfig().set("persistStorage", false);

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: 1,

        async requestHandler({ page }) {
            await page.waitForLoadState("domcontentloaded");

            cleanMarkdown = await page.evaluate(`
        (() => {
          // 1. Видаляємо технічне сміття
          const elementsToRemove = [
            "script", "style", "noscript", "iframe", "svg", ".cookie-banner", "#cookie-consent", "noindex"
          ];
          elementsToRemove.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => el.remove());
          });

          // Очищення тільки UTM-міток без обрізання query-параметрів та якорів
          const cleanUrl = (rawUrl) => {
            try {
              const u = new URL(rawUrl);
              
              // Видаляємо лише utm_* параметри аналітики
              const keysToDelete = [];
              u.searchParams.forEach((_, key) => {
                if (key.startsWith("utm_")) {
                  keysToDelete.push(key);
                }
              });
              keysToDelete.forEach((key) => u.searchParams.delete(key));

              return u.href; // Повертає повний URL (з query-параметрами та якорями)
            } catch {
              return rawUrl;
            }
          };

          const seenLinks = new Set();

          // 2. Обробка посилань
          document.querySelectorAll("a[href]").forEach((a) => {
            const rawText = a.innerText || a.textContent || a.getAttribute("aria-label") || "";
            const text = rawText.replace(/\\s+/g, " ").trim();
            let href = a.href;

            const isSocial = /(facebook|twitter|instagram|linkedin|youtube|github|t.me)\\.com/i.test(href);
            const isValid = text.length > 1 && href.startsWith("http") && !isSocial;

            if (isValid) {
              const sanitizedUrl = cleanUrl(href);
              const linkKey = text.toLowerCase() + "|" + sanitizedUrl;

              if (seenLinks.has(linkKey)) {
                a.replaceWith(document.createTextNode(" " + text + " "));
              } else {
                seenLinks.add(linkKey);
                a.replaceWith(document.createTextNode(" [" + text + "](" + sanitizedUrl + ") "));
              }
            } else if (text) {
              a.replaceWith(document.createTextNode(" " + text + " "));
            }
          });

          // 3. Обробка заголовків
          document.querySelectorAll("h1, h2, h3").forEach((h) => {
            const level = h.tagName.toLowerCase() === "h1" ? "# " : h.tagName.toLowerCase() === "h2" ? "## " : "### ";
            h.replaceWith(document.createTextNode("\\n\\n" + level + (h.textContent ? h.textContent.trim() : "") + "\\n"));
          });

          // 4. Очищений текст
          return document.body.innerText
            .split("\\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join("\\n");
        })()
      `);
        },
    });

    await crawler.run([url]);
    newie ? oldMarkdown = cleanMarkdown : null
    return cleanMarkdown;
}

const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,

    links: Annotation<string[]>(),
    steps: Annotation<Array<{ id: string; goal: string }>>(),

    secondaryLink: Annotation<{ url: number | null, step: number | null, secondUrl: string | null }>({
        default: () => ({ url: null, step: null, secondUrl: null }),
        reducer: (prev, next) => next ?? prev,
    }),

    currentLink: Annotation<number>({
        default: () => 0,
        reducer: (prev, next) => next ?? prev,
    }),

    currentStep: Annotation<number>({
        default: () => 0,
        reducer: (prev, next) => next ?? prev,
    }),

    stepInfo: Annotation<{ url: string, step_id: string, info: string }[]>({
        reducer: (current, update) => {
            const newItems = Array.isArray(update) ? update : [update];
            return current.concat(newItems);
        },
        default: () => [],
    }),
});

async function planner(state: typeof AgentState.State) {
    const baseModel = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0
    });
    const structmodel = baseModel.withStructuredOutput(
        z.object({
            steps: z.array(
                z.object({
                    id: z.string(),
                    goal: z.string()
                })
            )
        })
    )

    const humanMsg = new HumanMessage(
        `тобі дано певний список що потрібно найти, сформуй по тому списку план (накприклад:` +
        `\n{
      "id": "pricing",
      "goal": "Find current pricing plans"
    },
    {
      "id": "features",
      "goal": "Identify main product features"
    },
    {
      "id": "audience",
      "goal": "Identify target customer"
    },....`+
        `план мусить бути чіткий та покроковий. поки не роби кроку де пише про джерела`
    )

    const response = await structmodel.invoke([...state.messages, humanMsg])

    console.log(response)

    return {
        steps: response.steps,
        messages: [new AIMessage(JSON.stringify(response))]
    };
}

async function stepsController(state: typeof AgentState.State) {
    console.log('[STEPS CONTROLLER] Started work')
    console.log(state.steps[state.currentStep])
    const { id, goal } = state.steps[state.currentStep]
    const currentLink = state.secondaryLink.secondUrl == null ? state.links[state.currentLink] : state.secondaryLink.secondUrl
    console.log(currentLink)
    //const parser = await crawler.run([state.links[state.currentLink - 1]])
    const parser = state.secondaryLink.secondUrl == null ? state.currentStep == 0 ? await scrapePage(currentLink, true) : oldMarkdown : await scrapePage(currentLink, false)
    //console.log(goal + '\n\n')
    //console.log(parser)

    const baseModel = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0
    });
    const structmodel = baseModel.withStructuredOutput(
        z.object({
            reasoning: z
                .string()
                .describe(
                    `Крок-за-кроком аналіз вмісту: чи є тут безпосередньо потрібна інформація відповідно до мети(${goal}), чи є лише посилання на неї, чи немає нічого з цього.`
                ),
            status: z
                .enum(["content_found", "link_found", "not_found"])
                .describe(
                    "content_found — якщо на сторінці Є конкретні дані; link_found — якщо конкретних даних немає, але Є релевантне посилання; not_found — якщо немає ні того, ні іншого."
                ),
            extractedContent: z
                .string()
                .nullable()
                .describe("Знайдена КОНКРЕТНА інформація згідно з метою, не потрібно другорядної. ВСЕ ЧІТКО ТА СТРУКТУРОВАНО (заповнюй ТІЛЬКИ якщо status === 'content_found', інакше null)"),
            relevantUrl: z
                .string()
                .nullable()
                .describe("Точний URL із тексту, на якому швидше за все буде потрібна нам інформація (заповнюй ТІЛЬКИ якщо status === 'link_found', інакше null)"),
        })
    )

    const humanMsg = new HumanMessage(
        `подивись чи нище є потрібна інформація відповідно до зарашньої мети:'${goal}' або посилання де скоріш за все вона буде:` +
        `\n\n ${parser}`
    )

    const response = await structmodel.invoke([humanMsg])
    console.log(response)

    if (response.status == 'content_found' || response.status == 'not_found') {
        if (state.currentStep < state.steps.length - 1) {
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null },
                    currentStep: state.currentStep + 1
                },
                goto: 'stepsController'
            })
        } else if (state.currentStep >= state.steps.length - 1 && state.currentLink < state.links.length - 1) {
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null },
                    currentLink: state.currentLink + 1,
                    currentStep: 0
                },
                goto: 'stepsController'
            })
        } else if (state.currentLink >= state.links.length - 1) {// ----------------------------------------------------------------------------------
            console.log('==================== FINALISED ====================')
            console.log(state.stepInfo)
            console.log('===================================================')
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null },
                    currentLink: 0,
                    currentStep: 0
                },
                //goto: 'stepsController'// ----------------------------------------------------------------------------------
            })
        }
    } else if (response.status == 'link_found') {
        return new Command({
            update: {
                secondaryLink: { url: state.currentLink, step: state.currentStep, secondUrl: response.relevantUrl }
            },
            goto: 'stepsController'
        })
    }

}


const graph = new StateGraph(AgentState)
    .addNode('planner', planner)
    .addNode('stepsController', stepsController)
    .addEdge(START, 'planner')
    .addEdge('planner', 'stepsController')


const checkpointer = new MemorySaver()
const app = graph.compile({ checkpointer })

const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log(`WORKER STARTED: ${job.data.taskId}`)
    try {
        const { error } = await supabaseAdmin
            .from('research_tasks')
            .update({ status: 'planning' })
            .eq('id', job.data.taskId)

        if (error) throw error;

    } catch (error) {
        console.error('Error updating status: ', error);
        throw error;
    }

    const inputPayload = {
        messages: [
            new SystemMessage("Ти шукач певної інформації на даної інформації на даних сайтах."),
            new HumanMessage(`${job.data.goal}, \n\n Джерела: ${job.data.sources}`),
        ]
    };
    const config = {
        configurable: {
            thread_id: job.data.taskId
        },
    };

    const urls = job.data.sources.split(/\s+/).filter(Boolean);
    console.log(urls)

    const currentState = await app.invoke({
        ...inputPayload,

        links: urls,

    }, config);

    console.log("\n--- Повний лог повідомлень ---");
    currentState.messages.forEach(msg => {
        console.log(`[${msg._getType()}]:`, msg.content);
    });
},
    { connection: redisConnection }
)

worker.on('completed', async (job) => {
    console.log(`WORKER COMPLETED: ${job.data.taskId}`)
})

worker.on('failed', async (job, error) => {
    console.log(`[ERROR] ${job!.id}, ${error}`)
})
