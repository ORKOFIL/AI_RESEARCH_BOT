import { AgentState } from '@/lib/agentState';
import { setOutput } from '@/lib/researchStore';
import { Command, END } from "@langchain/langgraph";
import { updateResearchStatus } from "@/services/research/updateStatus"

export async function errorHandler(state: typeof AgentState.State) {
    const errorText = state.error_message || "Критичний збій";
    try {
        await updateResearchStatus('ERROR', state.jobId)
        
        await setOutput(state.jobId, `Дослідження перервано: ${errorText}`);

    } catch (dbError) {
        console.error("Не вдалося зберегти помилку:", dbError);
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