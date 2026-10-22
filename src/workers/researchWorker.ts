import path from 'path';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { setOutput, setStatus } from '@/lib/researchStore';
import { END, START, StateGraph, MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { updateResearchStatus } from "@/services/research/updateStatus"
import { AgentState } from '@/lib/agentState';
import { planner } from '@/services/ai/planner';
import { stepsController } from '@/services/ai/mainLogic';
import { infoFinalizer } from '@/services/ai/finalizer';
import { errorHandler } from '@/services/errors/errorHandler'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

const graph = new StateGraph(AgentState)
    .addNode('planner', planner)
    .addNode('stepsController', stepsController, {
        ends: ['infoFinalizer', 'errorHandlingNode']
    })
    .addNode('infoFinalizer', infoFinalizer)
    .addNode('errorHandlingNode', errorHandler)
    .addEdge(START, 'planner')
    .addEdge('planner', 'stepsController')
    .addEdge('infoFinalizer', END)

const checkpointer = new MemorySaver()
const app = graph.compile({ checkpointer })

const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    try {
        await setStatus(job.data.taskId, 'planning');

    } catch (error) {
        console.error('Error updating status: ', error);
        throw error;
    }

    const inputPayload = {
        messages: [
            new HumanMessage(`${job.data.goal}, \n\n Джерела: ${job.data.sources}`),
        ]
    };
    const config = {
        configurable: {
            thread_id: job.data.taskId
        },
        recursionLimit: 500,
    };

    const urls = job.data.sources.split(/\s+/).filter(Boolean);

    const currentState = await app.invoke({
        ...inputPayload,

        jobId: job.data.taskId,
        jobTitle: job.data.title,
        links: urls,
        goal: job.data.goal

    }, config);

},
    { connection: redisConnection }
)

worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);

    if (job?.data?.taskId) {
        await updateResearchStatus('ERROR', job.data.taskId)
        try {
            await setOutput(job.data.taskId, `Дослідження перервано: ${err.message}`);
        } catch (dbError) {
            console.error("Не вдалося записати результат ERROR:", dbError);
        }
    }
})
