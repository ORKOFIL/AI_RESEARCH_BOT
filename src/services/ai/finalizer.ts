import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import { END } from "@langchain/langgraph";

const baseModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0
});

export async function infoFinalizer(state: typeof AgentState.State) {
    console.log('[infoFinalizer] started')
    console.log(state.stepInfo)
    
    const rawDataString = typeof state.stepInfo === 'string' 
    ? state.stepInfo 
    : JSON.stringify(state.stepInfo, null, 2);

    const humanMsg = new HumanMessage(
        `дай мені відповідь в ТЕКСТОВОМУ форматі` +
        `я тобі нище дам основну інформацію зібрану з сайтів по мети клієнта: "${state.goal}", сформуй ЧІТКУ ТА КОНКРЕТНУ відповідь клієнту базуючись з інформації:` +
        `тобі НЕ ПОТРІБНО відвідувати НІЯКИХ ПОСИЛАНЬ, просто підсумуй інформацію нище, відповідно до мети.:` +
        `щоб всі відповіді були в ОДИНАКОВОМУ виводі даних, тобто ЄДИНА мова та форматування, та все взагалі одинакове` +
        `\n\n ${rawDataString}`
    )

    const response = await baseModel.invoke([humanMsg])

    console.log('==================== FINAL STATEMENT ====================')
    console.log(response.content)
    console.log('=========================================================')

    return END
}
