import { AgentState } from '@/lib/agentState';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Command, END } from "@langchain/langgraph";
import { updateResearchStatus } from "@/services/supabase/updateStatus"

export async function errorHandler(state: typeof AgentState.State) {
    const errorText = state.error_message || "Критичний збій";
    try {
        updateResearchStatus('ERROR', state.jobId)
        
        await supabaseAdmin
            .from('research_results')
            .insert([{ research_task_id: state.jobId, title: state.jobTitle, content: `Дослідження перервано: ${errorText}` }])
            .select()

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