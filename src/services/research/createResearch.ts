import { createRecord } from '@/lib/researchStore';

export async function createResearch(title: string, goal: string, sources: string) {
    try {
        return await createRecord(title, goal, sources);
    } catch (error) {
        console.error('Error creating research:', error);
        throw error;
    }
}
