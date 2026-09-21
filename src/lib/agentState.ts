import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,

    links: Annotation<string[]>(),
    steps: Annotation<Array<{ id: string; goal: string }>>(),
    goal: Annotation<string>(),

    secondaryLink: Annotation<{ url: number | null, step: number | null, secondUrl: string | null, notfound: number | null }>({
        default: () => ({ url: null, step: null, secondUrl: null, notfound: null }),
        reducer: (prev, next) => next ?? prev,
    }),

    currentLink: Annotation<number>({
        default: () => 0,
        reducer: (prev, next) => next ?? prev,
    }),

    currentStep: Annotation<number>({
        default: () => 0,
        reducer: (prev, next) => next ?? prev,
    }),

    stepInfo: Annotation<{ url: string, step_id: string, info: string }[]>({
        reducer: (current, update) => {
            const newItems = Array.isArray(update) ? update : [update];
            return current.concat(newItems);
        },
        default: () => [],
    }),

    oldMarkdown: Annotation<string>({
        reducer: (current, update) => (update !== undefined ? update : current),
        default: () => '',
    }),

});