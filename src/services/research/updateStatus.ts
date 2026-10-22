import { setStatus } from '@/lib/researchStore';

export async function updateResearchStatus(status: string, jobId: string) {
    try {
        await setStatus(jobId, status);
    } catch (error) {
        console.error('Error updating research status:', error);
        throw error;
    }
}
