import { prisma } from '@/lib/prisma';

export async function updateResearchStatus(status: string, jobId: string) {
    try {
        await prisma.researchTask.update({
            where: { id: jobId },
            data: { status },
        });
    } catch (error) {
        console.error('Error updating research status:', error);
        throw error;
    }
}
