import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function createResearch(userId: string, title: string, goal: string, sources: string, outputFormat: string) {
    try {
        const { error, data } = await supabaseAdmin
            .from('research_tasks')
            .insert([{ user_id: userId, title: title, goal: goal, sources: sources, outputFormat: outputFormat, status: 'pending' }])
            .select()

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('Failed to create research task: empty response');
        }

        return data[0].id;
    } catch (error) {
        console.error('Error creating research:', error);
        throw error;
    }
}