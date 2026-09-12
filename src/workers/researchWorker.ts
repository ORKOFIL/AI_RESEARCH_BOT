import path from 'path';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { END, START, StateGraph, Annotation, MessagesAnnotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
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



// const analyseCites = tool(
//     async ({ links }) => {
//         const prompt = new HumanMessage(`
//             позаходи в всі посилання в ${links} , перевір чи вони відповідають до теми та мети,
//             якщо ні, то познач що лінк не підходить,
//             якщо підходять, то витягни всю інформацію яка потрібна(потрібна інформація позначена в меті)
//             якщо данне посилання, це посилання на ревюшник, то надай мені ті всі сайти, позаходи там на кожен зазначений сайт та дай всю інформацію яка зазначена в меті пошуку`)


//     },
//     {
//         name: '',
//         description: '',
//         schema: z.object({
//             links: z.array(
//                 z.object({
//                     url: z.string().url().describe('Пряме посилання на сторінку')
//                 })
//             ).describe("список знайдених релевантних посилань")
//         })
//     }
// )



// const planner = tool(
//     async ({ }) => {

//     },
//     {
//         name: '',
//         description: '',
//         schema: z.object({
//             currentMaxSites: z.number().describe('Вкажи кількість сайтів яких потрібно шукати')
//         })
//     }
// )


const googleSearchNode = async (state: { query: number; currentMaxSites: number; }) => {
    console.log('[NODE] started googe search')
    try {
        const response = await axios.get('https://www.searchapi.io/api/v1/search', {
            params: {
                api_key: YOUR_SEARCHAPI_KEY,
                engine: 'google',
                q: state.query,
                num: state.currentMaxSites,
            },
        });
        const organicResults = response.data.organic_results || []

        const filtered = organicResults.map((item: { link: string }) =>
            item.link
        )
        console.log(filtered)
        return new Command({
            update: {
                notVisitedUrls: filtered
            }
        })

    } catch (error) {
        console.log(error)
        return ({ status: 'error', message: `[ERROR]: ${error}` })
    }
}

const googleQueryWriter = tool(
    async ({ query, maxSites }) => {
        console.log(`[QUERY] ${query}`)
        return new Command({
            update: {
                query: query,
                currentMaxSites: maxSites,
                targetCount: maxSites
            }
        })
    },
    {
        name: 'MakeUpGoogleQuery',
        description: 'Створити один запит в гугл для отримання посилань для подальшого парсингу інформації',
        schema: z.object({
            query: z.string().describe('напиши один короткий та простий запит для пошуку в гугл (наприклад: шукаю рецепт для вишневого пирога)'),
            maxSites: z.number().describe('кількість сайтів по яких будем робити дослідження (наприклад: 5)')
        })
    }
)

const tools = [googleQueryWriter]
const model = new ChatOpenAI({ modelName: "gpt-4o" }).bindTools(tools, {
    parallel_tool_calls: false
})


async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages)
    return { messages: [response] }
}

const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,

    currentMaxSites: Annotation<number>(),
    targetCount: Annotation<number>(),
    loopCount: Annotation<number>(),
    query: Annotation<string>(),

    notVisitedUrls: Annotation<string[]>(),

    visitedUrls: Annotation<string[]>({
        reducer: (currentState, updateValue) =>
            Array.from(new Set([...currentState, ...updateValue])),
        default: () => [],
    }),

    validResults: Annotation<string[]>({
        reducer: (currentState, updateValue) =>
            Array.from(new Set([...currentState, ...updateValue])),
        default: () => [],
    }),
});

const graph = new StateGraph(AgentState)
    .addNode('googleSearchNode', googleSearchNode)
    .addNode('tool', new ToolNode(tools))
    .addNode('callModel', callModel)
    .addEdge(START, 'callModel')
    .addEdge('callModel', 'tool')
    .addEdge('tool', 'googleSearchNode')
    .addEdge('googleSearchNode', END)


const checkpointer = new MemorySaver()
const app = graph.compile({ checkpointer })

const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log(`WORKER STARTED: ${job.data}`)
    console.log(`Найди ${job.data.maxSites} сайтів по темі ${job.data.title}, з метою ${job.data.goal}`)
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
            new SystemMessage("Ти шукач посилань на певну тему та з певною метою. Твоя мета найти відповідні сайти. Спочатку збери посилання, потім дай мені відповідь."),
            new HumanMessage(`Найди ${job.data.maxSites} сайтів по темі ${job.data.title}, з метою ${job.data.goal}`)
        ]
    };
    const config = {
        configurable: {
            thread_id: job.data.taskId
        }
    };

    const currentState = await app.invoke(inputPayload, config);

    console.log("\n--- Повний лог повідомлень ---");
    currentState.messages.forEach(msg => {
        console.log(`[${msg._getType()}]:`, msg.content);
    });

    // try {
    //     plannerWorker(`test req : ${job.data}`)
    // } catch (error) {
    //     console.error('Error planning cites: ', error);
    //     throw error;
    // }



},
    { connection: redisConnection }
)

worker.on('completed', async (job) => {
    console.log(`WORKER COMPLETED: ${job.data.taskId}`)
})

worker.on('failed', async (job, error) => {
    console.log(`[ERROR] ${job!.id}, ${error}`)
})