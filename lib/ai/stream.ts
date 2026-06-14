import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, getAnthropic } from "@/lib/ai/client";

export type StreamClaudeOptions = {
  system: string;
  cachedContext?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
};

function buildCachedUserMessage(
  cachedContext: string,
  trailingUserContent?: string
): Anthropic.MessageParam {
  const blocks: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: cachedContext,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ];

  if (trailingUserContent?.trim()) {
    blocks.push({ type: "text", text: trailingUserContent.trim() });
  }

  return { role: "user", content: blocks };
}

export async function* streamClaudeText(
  options: StreamClaudeOptions
): AsyncGenerator<string> {
  const {
    system,
    cachedContext,
    messages,
    maxTokens = 4096,
    temperature = 0.75,
  } = options;

  const client = getAnthropic();

  const anthropicMessages: Anthropic.MessageParam[] = [];

  if (cachedContext && messages.length > 0) {
    const [first, ...rest] = messages;
    if (first.role === "user") {
      anthropicMessages.push(
        buildCachedUserMessage(cachedContext, first.content)
      );
      anthropicMessages.push(...rest.map((m) => ({ role: m.role, content: m.content })));
    } else {
      anthropicMessages.push(buildCachedUserMessage(cachedContext));
      anthropicMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));
    }
  } else if (cachedContext) {
    anthropicMessages.push(buildCachedUserMessage(cachedContext));
  } else {
    anthropicMessages.push(
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    );
  }

  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: anthropicMessages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

export function createSseStream(
  generator: AsyncGenerator<string>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Stream failed.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}
