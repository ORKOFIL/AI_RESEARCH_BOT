import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,

    jobId: Annotation<string>(),
    jobTitle: Annotation<string>(),
    links: Annotation<string[]>(),
    steps: Annotation<Array<{ id: string; goal: string }>>(),
    goal: Annotation<string>(),

    errorRetries: Annotation<number>({
        reducer: (current, update) => (update !== undefined ? update : current),
        default: () => 0,
    }),

    secondaryLink: Annotation<{ url: number | null, step: number | null, secondUrl: string | null, notfound: number}>({
        default: () => ({ url: null, step: null, secondUrl: null, notfound: 0 }),
        reducer: (prev, next) => next ?? prev,
    }),
    loop: Annotation<number>({
        reducer: (current, update) => (update !== undefined ? update : current),
        default: () => 0,
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



    error_message: Annotation<string>(),

});