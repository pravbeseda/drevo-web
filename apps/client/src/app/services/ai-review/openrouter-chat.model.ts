/** The DTOs of OpenRouter's OpenAI-compatible chat completions, cut to the fields this app sends and reads. */
interface OpenRouterChatMessage {
    readonly role: 'system' | 'user';
    readonly content: string;
}

interface OpenRouterJsonSchemaFormat {
    readonly type: 'json_schema';
    readonly json_schema: {
        readonly name: string;
        readonly strict: boolean;
        readonly schema: object;
    };
}

export interface OpenRouterChatRequest {
    readonly model: string;
    readonly messages: readonly OpenRouterChatMessage[];
    readonly response_format: OpenRouterJsonSchemaFormat;
    readonly reasoning: { readonly effort: 'low' | 'medium' | 'high' };
}

export interface OpenRouterChatResponse {
    // Untrusted: a string when the model answered, `null` when it did not; the caller narrows it.
    readonly choices: readonly { readonly message: { readonly content: unknown } }[];
}
