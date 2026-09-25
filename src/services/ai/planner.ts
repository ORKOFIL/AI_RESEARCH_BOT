import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { AgentState } from "@/lib/agentState";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { updateResearchStatus } from "@/services/supabase/updateStatus"

const baseModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0
});

export async function planner(state: typeof AgentState.State) {
    updateResearchStatus('planning', state.jobId)

    const structmodel = baseModel.withStructuredOutput(
        z.object({
            steps: z.array(
                z.object({
                    id: z.string(),
                    goal: z.string()
                })
            )
        })
    )

    const humanMsg = new HumanMessage(
        `тобі дано певний список що потрібно найти, сформуй по тому списку план (накприклад:` +
        `\n{
      "id": "pricing",
      "goal": "Find current pricing plans"
    },
    {
      "id": "features",
      "goal": "Identify main product features"
    },
    {
      "id": "audience",
      "goal": "Identify target customer"
    },....`+
        `план мусить бути чіткий та покроковий. поки не роби кроку де пише про джерела`
    )

    const response = await structmodel.invoke([...state.messages, humanMsg])

    console.log(response)

    return {
        steps: response.steps,
        messages: [new AIMessage(JSON.stringify(response))]
    };
}