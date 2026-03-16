# Plan: Portfolio Agent MVP

## Qué es
Un chat embebido en tu resume web donde recruiters pueden preguntar sobre tus habilidades técnicas. El agente responde con conocimiento real de tu código (sin mostrarlo), basándose en fragmentos donde eres autor/co-autor.

## Arquitectura

```
[Tu web HTML] → [Chat widget JS] → [Cloudflare Worker API] → [Claude]
                                            ↑
                                    [Vectorize: embeddings
                                     de tu código indexado]
```

## Pasos de implementación

### Paso 1: Script de indexación local
- Script Node.js que recorre repos locales
- Usa `git blame` para filtrar solo líneas donde eres autor
- Agrupa el código en chunks con contexto (archivo, función, repo)
- Genera descripciones/resúmenes de cada chunk (no código literal)
- Genera embeddings con la API de Cloudflare AI (`@cf/baai/bge-base-en-v1.5`)
- Sube los embeddings a Cloudflare Vectorize

**Output:** Base de vectores con tu conocimiento técnico indexado

### Paso 2: Cloudflare Worker (API del agente)
- Endpoint `POST /api/chat` que recibe la pregunta del recruiter
- Busca en Vectorize los chunks más relevantes
- Construye el prompt con:
  - Tu CV como contexto base
  - Los chunks relevantes (descripciones, no código)
  - Instrucciones: responder sobre tus habilidades, no filtrar código
- Llama a Claude API y devuelve la respuesta en streaming

### Paso 3: Chat widget en tu web
- Componente JS mínimo embebido en `index.html`
- Caja de chat flotante (esquina inferior derecha)
- Envía preguntas al Worker, muestra respuestas en streaming
- Estilo consistente con tu diseño actual (Commit Mono, colores)

### Paso 4: Prompt engineering
- System prompt que define al agente como tu representante profesional
- Instrucciones claras: describir competencias, nunca mostrar código fuente
- Tono profesional pero cercano
- Respuestas concisas y relevantes para recruiters

## Stack técnico
- **Indexación:** Node.js + git blame + Cloudflare AI API
- **Backend:** Cloudflare Worker (TypeScript)
- **Vector DB:** Cloudflare Vectorize
- **LLM:** Claude API (Anthropic)
- **Frontend:** Vanilla JS (widget de chat en tu HTML existente)

## Fuera de scope (para después)
- OAuth con GitHub/GitLab (multi-usuario)
- Dashboard para gestionar repos
- Múltiples candidatos
- Billing/Stripe
