import { prisma } from '@/lib/prisma';

export async function createResearch(title: string, goal: string, sources: string) {
    try {
        const task = await prisma.researchTask.create({
            data: { title, goal, sources, status: 'pending' },
        });

        return task.id;
    } catch (error) {
        console.error('Error creating research:', error);
        throw error;
    }
}
