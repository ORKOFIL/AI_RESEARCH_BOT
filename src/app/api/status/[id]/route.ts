import { getRecord } from '@/lib/researchStore';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        const task = await getRecord(taskId);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        return NextResponse.json({ status: task.status })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}