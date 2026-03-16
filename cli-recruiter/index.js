#!/usr/bin/env node

import * as readline from "node:readline";

const API_URL = process.env.AGENT_API_URL || "http://localhost:8787";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";

function print(text, style = "") {
  process.stdout.write(`${style}${text}${RESET}\n`);
}

function printStreaming(text) {
  process.stdout.write(text);
}

async function chat(messages) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.text) {
          fullResponse += parsed.text;
          printStreaming(parsed.text);
        }
      } catch {}
    }
  }

  process.stdout.write("\n\n");
  return fullResponse;
}

// ── Main ──

console.clear();
print("", "");
print("  Javier Jiménez de Frutos", BOLD + CYAN);
print("  Technical Lead @ YouForce by Visma", DIM);
print("", "");
print("  AI agent — ask me anything about my experience", DIM);
print(`  Type "exit" to quit`, DIM);
print("", "");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${GREEN}$ ${RESET}`,
});

const conversationHistory = [];

rl.prompt();

rl.on("line", async (line) => {
  const query = line.trim();
  if (!query) {
    rl.prompt();
    return;
  }

  if (query === "exit" || query === "quit") {
    print("\n  See you around.\n", DIM);
    process.exit(0);
  }

  conversationHistory.push({ role: "user", content: query });

  process.stdout.write("\n");

  try {
    const response = await chat(conversationHistory);
    conversationHistory.push({ role: "assistant", content: response });
  } catch (err) {
    print("  Error: could not reach the agent. Is the server running?", DIM);
    print(`  ${err.message}`, DIM);
    process.stdout.write("\n");
    conversationHistory.pop(); // remove failed user message
  }

  rl.prompt();
});

rl.on("close", () => {
  print("\n  See you around.\n", DIM);
  process.exit(0);
});
