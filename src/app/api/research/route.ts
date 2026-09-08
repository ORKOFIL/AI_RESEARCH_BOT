import { NextResponse } from 'next/server';
import { createResearch } from '@/services/research/createResearch';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user, title, goal, sources, maxSites, outputFormat } = body;

        await createResearch( user.id, title, goal, sources, maxSites, outputFormat )

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