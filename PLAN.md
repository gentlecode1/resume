# Plan: Portfolio Agent MVP

## Qué es
Un chat embebido en tu resume web donde recruiters pueden preguntar sobre ti como candidato. El agente responde con dos fuentes de conocimiento:
1. **Entrevista personal** — tu filosofía técnica, motivaciones, decisiones de diseño, preferencias, soft skills
2. **RAG de tu código** — conocimiento real de los repos donde eres autor/co-autor (sin mostrar código)

## Arquitectura

```
[Tu web HTML] → [Chat widget JS] → [Cloudflare Worker API] → [Claude]
                                            ↑
                                  ┌─────────┴─────────┐
                                  │                    │
                          [Vectorize:            [Entrevista:
                           embeddings             contexto personal
                           de tu código]          en primera persona]
```

## Fuentes de conocimiento

### Fuente 1: Entrevista al candidato
Una sesión estructurada donde Claude te entrevista sobre:
- **Decisiones técnicas** — ¿por qué elegiste X sobre Y?
- **Filosofía** — ¿cómo abordas arquitectura, testing, refactoring?
- **Liderazgo** — ¿cómo gestionas equipo, mentoring, conflictos técnicos?
- **Motivaciones** — ¿qué buscas en tu siguiente rol?
- **Soft skills** — comunicación, colaboración con UX/producto
- **Opiniones** — estado del frontend, IA en desarrollo, etc.

El resultado es un documento estructurado que se inyecta como contexto base en cada conversación con recruiters.

### Fuente 2: RAG del código
Indexación de tus repos filtrada por autoría (`git blame`), convertida en descripciones semánticas (no código literal), almacenada como embeddings en Vectorize.

## Pasos de implementación

### Paso 0: Entrevista personal
- Script/sesión interactiva donde Claude te hace preguntas estructuradas
- Tú respondes en lenguaje natural
- Se genera un documento `profile.json` con tu contexto personal
- Este documento se usa como system prompt base del agente

**Output:** `profile.json` con tu conocimiento en primera persona

### Paso 1: Script de indexación de código
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
  - `profile.json` como contexto base (quién eres, cómo piensas)
  - Tu CV como referencia factual
  - Los chunks relevantes del RAG (descripciones, no código)
  - Instrucciones: representarte fielmente, nunca mostrar código fuente
- Llama a Claude API y devuelve la respuesta en streaming

### Paso 3: Chat widget en tu web
- Componente JS mínimo embebido en `index.html`
- Caja de chat flotante (esquina inferior derecha)
- Envía preguntas al Worker, muestra respuestas en streaming
- Estilo consistente con tu diseño actual (Commit Mono, colores)

### Paso 4: Prompt engineering
- System prompt que combina entrevista + CV + RAG
- El agente habla como si te conociera de verdad (porque te entrevistó)
- Cuando el recruiter pregunta algo técnico, respalda con evidencia del código
- Tono profesional pero cercano
- Respuestas concisas y relevantes para recruiters

## Ejemplo de interacción

> **Recruiter:** ¿Por qué eligió Signals en vez de NgRx?
> **Agente:** Javier prefiere un enfoque funcional al state management. En su experiencia con NgRx en proyectos anteriores, el boilerplate no justificaba el beneficio en apps medianas. Con Signals consiguió estado predecible y testable con menos complejidad — lo que además facilita que agentes de IA generen código correcto con TDD.

> **Recruiter:** ¿Tiene experiencia liderando equipos?
> **Agente:** Sí. Como Tech Lead en YouForce lidera las decisiones técnicas del frontend, incluyendo la migración a zoneless architecture y la creación del design system. Javier describe su estilo de liderazgo como orientado a crear abstracciones que den autonomía al equipo — prefiere diseñar patrones claros a hacer code review línea por línea.

## Stack técnico
- **Entrevista:** Script interactivo + Claude API → `profile.json`
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
- Entrevista guiada automática para nuevos usuarios
