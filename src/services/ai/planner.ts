import axios from 'axios';
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { Command } from "@langchain/langgraph";

const YOUR_SEARCHAPI_KEY = process.env.YOUR_SEARCHAPI_KEY;

export const googleSearchWorker = tool(
    async ({ query, maxSites }, config) => {
        console.log('[WORKER] started googe search')
        try {
            const toolCallId = config.toolCall?.id;

            if (!toolCallId) {
                throw new Error("Missing toolCall.id in config");
            }

            const response = await axios.get('https://www.searchapi.io/api/v1/search', {
                params: {
                    api_key: YOUR_SEARCHAPI_KEY,
                    engine: 'google',
                    q: query,
                    num: maxSites,
                },
            });
            const organicResults = response.data.organic_results || []

            const filtered = organicResults.map((item: { link: string }) =>
                item.link
            )

            const searchResult = (`знайдено ${maxSites} сайтів для аналізу: ${filtered.join(' ; ')}`)
            console.log(searchResult)

            const toolMsg = new ToolMessage({
                content: searchResult,
                tool_call_id: toolCallId
            })

            const humanMsg = new HumanMessage(`
                Позаходь у всі посилання, перевір чи вони відповідають меті. Якщо ні — познач що лінк не підходить. 
                Якщо підходять або це сайт-ревюшник — витягни всю необхідну інформацію.
                Якщо сайт-ревюшник без потрібної інформації, то позаходи на посилання сайтів які він надає та вже там отримай потрібну інформацію

                якщо не достатньо сайтів, то подвой пошук
            `)
            return new Command({
                update: {
                    messages: [toolMsg, humanMsg]
                }
            })

        } catch (error) {
            console.log(error)
            return ({ status: 'error', message: `[ERROR]: ${error}` })
        }
    },
    {
        name: 'makeListOfLinks',
        description: 'Створити запит в гугл для отримання посилань для подальшого парсингу інформації',
        schema: z.object({
            query: z.string().describe("напиши короткий та простий запит для пошуку в гугл (наприклад: шукаю рецепт для вишневого пирога)"),
            maxSites: z.number().describe('кількість сайтів по яких будем робити дослідження (наприклад: 5)')
        })
    }
)