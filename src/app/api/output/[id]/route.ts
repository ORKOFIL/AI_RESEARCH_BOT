import { getRecord } from '@/lib/researchStore';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        const result = await getRecord(taskId);

        if (!result?.output) {
            return NextResponse.json({ error: 'Result not found' }, { status: 404 })
        }

        return NextResponse.json({ output: result.output })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}