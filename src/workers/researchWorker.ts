import path from 'path';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plannerWorker } from '@/services/ai/planner'
import { END, START, StateGraph, MessagesAnnotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";


dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

async function startProcess() {

}

const graph = new StateGraph(MessagesAnnotation)

const checkpointer = new MemorySaver()
const app = graph.compile({ checkpointer })

const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log(`WORKER STARTED: ${job.data}`)
    try {
        const { error } = await supabaseAdmin
            .from('research_tasks')
            .update({ status: 'planning' })
            .eq('id', job.data)

        if (error) throw error;

    } catch (error) {
        console.error('Error updating status: ', error);
        throw error;
    }

    const inputPayload = { messages: [new HumanMessage("сформуй список сайтів")] };
    const config = { configurable: { thread_id: job.data } };

    await app.invoke(inputPayload, config);

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
    console.log(`WORKER COMPLETED: ${job.data}`)
})