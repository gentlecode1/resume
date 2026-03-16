import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompt";
import { getTuiHtml } from "./tui";

type Bindings = {
  ANTHROPIC_API_KEY: string;
  // VECTORIZE: VectorizeIndex; // Enable when RAG is ready
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

// Serve web TUI for recruiters
app.get("/", (c) => {
  return c.html(getTuiHtml());
});

// Chat API — SSE streaming
app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{
    messages: { role: "user" | "assistant"; content: string }[];
  }>();

  if (!messages?.length) {
    return c.json({ error: "No messages provided" }, 400);
  }

  const anthropic = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

  // TODO: RAG lookup in Vectorize
  // const ragContext = await searchVectorize(messages[messages.length - 1].content);
  const systemPrompt = buildSystemPrompt();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return streamSSE(c, async (sseStream) => {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        await sseStream.writeSSE({
          data: JSON.stringify({ text: event.delta.text }),
        });
      }
    }
    await sseStream.writeSSE({ data: "[DONE]" });
  });
});

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
