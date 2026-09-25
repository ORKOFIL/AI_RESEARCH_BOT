import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        console.log(taskId)
        const { data, error } = await supabaseAdmin
            .from('research_tasks')
            .select('status')
            .eq('id', taskId)
            .select()
        console.log(data![0].status)

        if (error || !data) {
            return NextResponse.json(
                { error: `Failed to process request: ${error}` },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ status: data![0].status })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}