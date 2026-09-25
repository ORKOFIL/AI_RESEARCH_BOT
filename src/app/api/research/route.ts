import { NextResponse } from 'next/server';
import { createResearch } from '@/services/research/createResearch';
import { researchQueue, RESEARCH_QUEUE_NAME } from '@/lib/queue';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user, title, goal, sources } = body;

        const taskId = await createResearch(user.id, title, goal, sources)

        const jobb = await researchQueue.add(RESEARCH_QUEUE_NAME, {taskId, title, goal, sources}, {
            attempts: 3,
            backoff: { type: 'fixed', delay: 5000 }
        })

        console.log(jobb.returnvalue)

        return NextResponse.json(
            { success: true, data: { taskId,title, goal, sources } },
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