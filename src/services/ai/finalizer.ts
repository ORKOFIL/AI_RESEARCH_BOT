import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import { updateResearchStatus } from "@/services/supabase/updateStatus"
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
        `відповідь НЕ в JSON форматі а В текстовому`+
        `\n\n ${rawDataString}`
    )

    const response = await baseModel.invoke([humanMsg])

    console.log('==================== FINAL STATEMENT ====================')
    console.log(response.content)
    console.log('=========================================================')

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
