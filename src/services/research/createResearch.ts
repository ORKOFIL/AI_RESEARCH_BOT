import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function createResearch(userId: string, title: string, goal: string, sources: string, maxSites: number, outputFormat: string ) {
    try {
        const { error, data } = await supabaseAdmin
            .from('research_tasks')
            .insert([{ user_id: userId, title: title, goal:goal, sources:sources, maxSites:maxSites, outputFormat:outputFormat, status: 'pending' }])
            .select()

        if (!error) {
            return { id: data![0].id, status: data![0].status };
        } else {
            console.log(error);
            throw error;
        }
    } catch (error) {
        console.error('Error creating research:', error);
        throw error;
    }
}