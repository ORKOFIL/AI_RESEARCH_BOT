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
import { updateResearchStatus } from "@/services/supabase/updateStatus"
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
    console.log(urls)

    const currentState = await app.invoke({
        ...inputPayload,

        jobId: job.data.taskId,
        jobTitle: job.data.title,
        links: urls,
        goal: job.data.goal

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

worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);

    if (job?.data?.taskId) {
        updateResearchStatus('ERROR', job.data.taskId)
        const { error: dbError } = await supabaseAdmin
            .from('research_results')
            .insert([{ research_task_id: job.data.taskId, title: job.data.title, content: `Дослідження перервано: ${err.message}` }])
            .select()
        if (dbError) {
            console.error("Не вдалося записати статус ERROR в Supabase:", dbError.message);
        }
    }
})
