import { AgentState } from '@/lib/agentState';
import { prisma } from '@/lib/prisma';
import { Command, END } from "@langchain/langgraph";
import { updateResearchStatus } from "@/services/research/updateStatus"

export async function errorHandler(state: typeof AgentState.State) {
    const errorText = state.error_message || "Критичний збій";
    try {
        await updateResearchStatus('ERROR', state.jobId)
        
        await prisma.researchResult.create({
            data: { researchTaskId: state.jobId, title: state.jobTitle, content: `Дослідження перервано: ${errorText}` },
        });

    } catch (dbError) {
        console.error("Не вдалося зберегти помилку в БД:", dbError);
    }

    return new Command({
        update: {
            status: "error",
            output: errorText,
            stepInfo: [...(state.stepInfo || []), `[FAIL] ${errorText}`],
        },
        goto: END
    });
}