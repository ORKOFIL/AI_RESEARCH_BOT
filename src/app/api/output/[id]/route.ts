import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        const result = await prisma.researchResult.findFirst({
            where: { researchTaskId: taskId },
            select: { content: true },
        });

        if (!result) {
            return NextResponse.json({ error: 'Result not found' }, { status: 404 })
        }

        return NextResponse.json({ output: result.content })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}