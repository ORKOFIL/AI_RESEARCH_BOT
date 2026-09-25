import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function updateResearchStatus(status: string, jobId: string) {
    try {
        const { error, data } = await supabaseAdmin
            .from('research_tasks')
            .update({ status: status })
            .eq('id', jobId)
            .select()

        if (error) throw error;

        if (!data) {
            throw new Error('Failed to create research task: empty response');
        }
    } catch (error) {
        console.error('Error updatinf research status:', error);
        throw error;
    }
}