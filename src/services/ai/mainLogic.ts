import * as z from "zod";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import { Command } from "@langchain/langgraph";
import { scrapePage } from "@/services/browser/parser"

const baseModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0
});

async function getSynonim(goal: string) {
    const result = await baseModel.withStructuredOutput(z.object({
        queries: z.array(z.string()).describe("Масив з 2-3 альтернативних пошукових фраз/синонімів")
    })).invoke([
        new SystemMessage("Згенеруй 2-3 альтернативні короткі пошукові фрази для знаходження інформації, якщо первинний запит не дав результатів."),
        new HumanMessage(`Початкова мета: "${goal}"`)
    ]);

    return result.queries.toString();
}

export async function stepsController(state: typeof AgentState.State) {
    console.log('[STEPS CONTROLLER] Started work')
    console.log(state.steps[state.currentStep])
    const { id, goal } = state.steps[state.currentStep]
    const currentLink = state.secondaryLink.secondUrl == null ? state.links[state.currentLink] : state.secondaryLink.secondUrl
    console.log(currentLink)

    let synonimGoal = ''
    let oldMarkdown = state.oldMarkdown ?? ''

    let parser = ""
    if (state.secondaryLink.secondUrl == null) {
        if (state.currentStep == 0) {
            const { cleanMarkdown, resp } = await scrapePage(currentLink)
            if (resp.requestsFailed != 0) {
                console.log('\n\nERROR\n\n')
                return new Command({
                    update: {
                        stepInfo: { url: state.links[state.currentLink], step_id: id, info: 'THIS LINK IS INCORRECT' },
                        secondaryLink: { url: null, step: null, secondUrl: null },
                        currentLink: state.currentLink + 1,
                        currentStep: 0
                    },
                    goto: 'stepsController'
                })
            }
            oldMarkdown = cleanMarkdown
            parser = cleanMarkdown
        } else {
            parser = oldMarkdown
        }
    } else {
        const { cleanMarkdown } = await scrapePage(currentLink)
        parser = cleanMarkdown
    }

    if (state.secondaryLink.notfound != null) {
        synonimGoal = await getSynonim(goal)
    }

    const structmodel = baseModel.withStructuredOutput(
        z.object({
            reasoning: z
                .string()
                .describe(
                    `Крок-за-кроком аналіз вмісту: чи є тут безпосередньо потрібна інформація відповідно до мети(${state.secondaryLink.notfound != null ? synonimGoal : goal}), чи є лише посилання на неї, чи немає нічого з цього.`
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
        `подивись чи нище є потрібна інформація відповідно до зарашньої мети:'${state.secondaryLink.notfound != null ? synonimGoal : goal}' або посилання де скоріш за все вона буде:` +
        `\n\n ${parser}`
    )

    const response = await structmodel.invoke([humanMsg])
    console.log(response)

    if (response.status == 'content_found' || (response.status == 'not_found' && state.secondaryLink.notfound != null)) {
        if (state.currentStep < state.steps.length - 1) {
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null, notfound: null },
                    currentStep: state.currentStep + 1,
                    oldMarkdown: oldMarkdown
                },
                goto: 'stepsController'
            })
        } else if (state.currentStep >= state.steps.length - 1 && state.currentLink < state.links.length - 1) {
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null, notfound: null },
                    currentLink: state.currentLink + 1,
                    currentStep: 0,
                    oldMarkdown: oldMarkdown
                },
                goto: 'stepsController'
            })
        } else if (state.currentLink >= state.links.length - 1) {
            console.log('==================== FINALISED ====================')
            console.log(state.stepInfo)
            console.log('===================================================')
            return new Command({
                update: {
                    stepInfo: { url: state.links[state.currentLink], step_id: id, info: response.status == 'not_found' ? response.reasoning : response.extractedContent },
                    secondaryLink: { url: null, step: null, secondUrl: null, notfound: null },
                    currentLink: 0,
                    currentStep: 0,
                    oldMarkdown: oldMarkdown
                },
                goto: 'infoFinalizer'
            })
        }
    } else if (response.status == 'link_found') {
        return new Command({
            update: {
                secondaryLink: { url: state.currentLink, step: state.currentStep, secondUrl: response.relevantUrl },
                oldMarkdown: oldMarkdown
            },
            goto: 'stepsController'
        })
    } else if (response.status == 'not_found' && state.secondaryLink.notfound == null) {
        return new Command({
            update: {
                secondaryLink: { url: null, step: null, secondUrl: null, notfound: 0 },
                oldMarkdown: oldMarkdown
            },
            goto: 'stepsController'
        })
    }
}