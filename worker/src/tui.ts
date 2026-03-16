// Web TUI HTML — terminal aesthetic for recruiters
export function getTuiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml("Javier Jiménez — Ask me anything")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @font-face {
      font-family: 'Commit Mono';
      src: url('https://cdn.jsdelivr.net/gh/eigilnikolajsen/commit-mono/CommitMono-Regular.woff2') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Commit Mono';
      src: url('https://cdn.jsdelivr.net/gh/eigilnikolajsen/commit-mono/CommitMono-Bold.woff2') format('woff2');
      font-weight: 700;
    }

    :root {
      --bg: #0a0a0a;
      --fg: #d4d4d4;
      --dim: #666;
      --accent: #4ade80;
      --input-fg: #e0e0e0;
      --prompt: #4ade80;
    }

    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Commit Mono', 'SF Mono', 'Fira Code', monospace;
      font-size: 14px;
      line-height: 1.6;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    #terminal {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      padding-bottom: 0;
    }

    #terminal::-webkit-scrollbar { width: 6px; }
    #terminal::-webkit-scrollbar-track { background: var(--bg); }
    #terminal::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

    .line { margin-bottom: 0.25rem; white-space: pre-wrap; word-wrap: break-word; }
    .line.system { color: var(--dim); font-style: italic; }
    .line.prompt-line { color: var(--prompt); }
    .line.response { color: var(--fg); }

    .prompt-symbol { color: var(--prompt); font-weight: 700; }

    #input-area {
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-top: 1px solid #1a1a1a;
    }

    #input-area .prompt-symbol {
      flex-shrink: 0;
    }

    #input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: var(--input-fg);
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      caret-color: var(--accent);
    }

    #input::placeholder { color: #444; }

    #input:disabled { opacity: 0.5; }

    .cursor-blink::after {
      content: '█';
      animation: blink 1s step-end infinite;
      color: var(--accent);
    }

    @keyframes blink {
      50% { opacity: 0; }
    }

    @media (max-width: 600px) {
      body { font-size: 13px; }
      #terminal { padding: 1rem; }
      #input-area { padding: 0.75rem 1rem; }
    }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <div id="input-area">
    <span class="prompt-symbol">$</span>
    <input id="input" type="text" placeholder="ask me anything..." autofocus autocomplete="off" />
  </div>

  <script>
    const terminal = document.getElementById('terminal');
    const input = document.getElementById('input');
    const conversationHistory = [];

    function addLine(text, className) {
      const div = document.createElement('div');
      div.className = 'line ' + (className || '');
      div.textContent = text;
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
      return div;
    }

    function addHtml(html, className) {
      const div = document.createElement('div');
      div.className = 'line ' + (className || '');
      div.innerHTML = html;
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
      return div;
    }

    // Welcome message
    addLine('AI agent representing Javier Jiménez de Frutos', 'system');
    addLine('Technical Lead @ YouForce by Visma', 'system');
    addLine('Type a question to get started. Try: "who are you" or "experience with angular"', 'system');
    addLine('', '');

    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const query = input.value.trim();
      if (!query) return;

      // Show user input
      addHtml('<span class="prompt-symbol">$</span> ' + escapeHtml(query), 'prompt-line');
      input.value = '';
      input.disabled = true;

      conversationHistory.push({ role: 'user', content: query });

      // Create response line
      const responseLine = addLine('', 'response');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!res.ok) throw new Error('API error: ' + res.status);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullResponse += parsed.text;
                responseLine.textContent = fullResponse;
                terminal.scrollTop = terminal.scrollHeight;
              }
            } catch {}
          }
        }

        conversationHistory.push({ role: 'assistant', content: fullResponse });
      } catch (err) {
        responseLine.textContent = 'Error: could not reach the agent. Try again.';
        responseLine.classList.add('system');
      }

      addLine('', '');
      input.disabled = false;
      input.focus();
    });

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
