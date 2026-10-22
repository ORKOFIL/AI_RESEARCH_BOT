import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import { updateResearchStatus } from "@/services/research/updateStatus"
import { prisma } from '@/lib/prisma';
import { Command } from "@langchain/langgraph";

const baseModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0
});

export async function infoFinalizer(state: typeof AgentState.State) {
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
        await prisma.researchResult.create({
            data: { researchTaskId: state.jobId, title: state.jobTitle, content: String(response.content) },
        });
    } catch (error) {
        console.error('Error inserting finalized info:', error);
        throw error;
    }

    updateResearchStatus('finished', state.jobId)
}
