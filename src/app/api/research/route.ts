import { NextResponse } from 'next/server';
import { createResearch } from '@/services/research/createResearch';
import { researchQueue, RESEARCH_QUEUE_NAME } from '@/lib/queue';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user, title, goal, sources, maxSites, outputFormat } = body;

        const taskId = await createResearch(user.id, title, goal, sources, maxSites, outputFormat)

        const jobb = await researchQueue.add(RESEARCH_QUEUE_NAME, taskId)

        console.log(jobb.returnvalue)
        // await researchQueue.add(RESEARCH_QUEUE_NAME, taskId, {
        //     attempts: 3,
        //     backoff: { type: 'fixed', delay: 1000 }
        // })

        return NextResponse.json(
            { success: true, data: { title, goal, sources, maxSites, outputFormat } },
            { status: 201 }
        );
    } catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}