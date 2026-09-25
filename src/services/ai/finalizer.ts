import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import { updateResearchStatus } from "@/services/supabase/updateStatus"
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Command } from "@langchain/langgraph";

const baseModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0
});

export async function infoFinalizer(state: typeof AgentState.State) {
    console.log('[infoFinalizer] started')
    console.log(state.stepInfo)

    updateResearchStatus('summarizing information', state.jobId)

    const rawDataString = typeof state.stepInfo === 'string'
        ? state.stepInfo
        : JSON.stringify(state.stepInfo, null, 2);

    const humanMsg = new HumanMessage(
        `дай мені відповідь в ТЕКСТОВОМУ форматі` +
        `я тобі нище дам основну інформацію зібрану з сайтів по мети клієнта: "${state.goal}", сформуй ЧІТКУ ТА КОНКРЕТНУ відповідь клієнту базуючись з інформації:` +
        `тобі НЕ ПОТРІБНО відвідувати НІЯКИХ ПОСИЛАНЬ, просто підсумуй інформацію нище, відповідно до мети.:` +
        `щоб всі відповіді були в ОДИНАКОВОМУ виводі даних, тобто ЄДИНА мова та форматування, та все взагалі одинакове` +
        `відповідь НЕ в JSON форматі а В текстовому` +
        `\n\n ${rawDataString}`
    )

    let response;
    try {
        response = await baseModel.invoke([humanMsg])
    } catch (error) {
        console.error("OpenAI API Error:", error)
        if (state.errorRetries < 3) {
            console.log(`Повторна спроба... (${state.errorRetries + 1}/3)`);
            return new Command({
                update: { errorRetries: state.errorRetries + 1 },
                goto: "infoFinalizer"
            });
        } else {
            return new Command({
                update: {
                    errorRetries: 0,
                    error_message: "LLM failed after 3 retries"
                },
                goto: "errorHandlingNode"
            });
        }
    }
    try {
        const { error, data } = await supabaseAdmin
            .from('research_results')
            .insert([{ research_task_id: state.jobId, title: state.jobTitle, content: response.content }])
            .select()

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('Failed to create research task: empty response');
        }
    } catch (error) {
        console.error('Error inserting finalized info:', error);
        throw error;
    }

    updateResearchStatus('finished', state.jobId)
}
