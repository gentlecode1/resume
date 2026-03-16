# Plan: Portfolio Agent MVP

## Qué es
Un producto con dos caras:
1. **TUI para el dev** — CLI donde te entrevistan, indexas repos, y despliegas
2. **TUI para el recruiter** — web con estética de terminal donde el recruiter pregunta y el agente responde en primera persona, respaldado por tu código real

## Arquitectura

```
DEV SIDE (CLI):                         RECRUITER SIDE (Web TUI):

$ npx portfolio-agent                   https://javier.dev (o similar)
┌──────────────────────┐                ┌──────────────────────────────┐
│ > Entrevista         │                │ $ ask me anything_           │
│   Indexar repos      │──deploy──→     │                              │
│   Deploy             │                │ > Prefiero un enfoque        │
│   Config             │                │   funcional al state...      │
└──────────────────────┘                └──────────────────────────────┘
        │                                          │
        ▼                                          ▼
  profile.json                           Cloudflare Worker + Claude
  + embeddings ──────────────────────→         ↑
                                        [Vectorize + profile.json]
```

## Fuentes de conocimiento

### Fuente 1: Entrevista al candidato
Sesión interactiva en la TUI donde Claude te entrevista sobre:
- **Decisiones técnicas** — ¿por qué elegiste X sobre Y?
- **Filosofía** — ¿cómo abordas arquitectura, testing, refactoring?
- **Liderazgo** — ¿cómo gestionas equipo, mentoring, conflictos técnicos?
- **Motivaciones** — ¿qué buscas en tu siguiente rol?
- **Soft skills** — comunicación, colaboración con UX/producto
- **Opiniones** — estado del frontend, IA en desarrollo, etc.

El resultado es `profile.json`, contexto base del agente.

### Fuente 2: RAG del código
Indexación de repos locales filtrada por autoría (`git blame`), convertida en descripciones semánticas (no código literal), almacenada como embeddings en Vectorize.

## Pasos de implementación

### Paso 1: TUI del dev (CLI)
- Menú principal con opciones: Entrevista, Indexar, Deploy, Config
- Construido con Ink (React para terminal) o similar
- Flujo guiado paso a paso

### Paso 2: Entrevista interactiva en TUI
- Claude te hace preguntas una a una en el terminal
- Tú respondes en texto libre
- Al terminar, genera `profile.json`
- Se puede re-ejecutar para actualizar respuestas

**Output:** `profile.json`

### Paso 3: Indexación de repos
- Seleccionas carpetas de repos locales
- `git blame` filtra por tu autoría
- Genera descripciones semánticas de cada chunk
- Genera embeddings con Cloudflare AI
- Sube a Vectorize
- Barra de progreso en la TUI

**Output:** Embeddings en Vectorize

### Paso 4: Cloudflare Worker (API del agente)
- Endpoint `POST /api/chat` — recibe pregunta, devuelve respuesta en streaming
- Busca chunks relevantes en Vectorize
- Prompt: `profile.json` + CV + chunks del RAG
- Claude responde en primera persona
- Endpoint `GET /` — sirve la web TUI del recruiter

### Paso 5: Web TUI para recruiters
- Página web con estética de terminal (fondo oscuro, monospace, cursor)
- El recruiter escribe preguntas como comandos
- Respuestas en streaming simulando output de terminal
- Commit Mono como font
- Disclaimer: "Este es un agente IA que me representa"
- Responsive (funciona en móvil también)

### Paso 6: Deploy desde la TUI
- `Deploy` en el menú sube el Worker a Cloudflare
- Muestra la URL final
- El dev la comparte con recruiters

### Paso 7: Prompt engineering
- System prompt en primera persona
- Combina entrevista + CV + RAG
- Tono coherente con la personalidad del dev
- Nunca muestra código fuente
- Disclaimer claro de que es IA

## Ejemplo de interacción (recruiter web TUI)

```
$ who are you
> Soy Javier Jiménez, Technical Lead en YouForce by Visma.
  Diseño las abstracciones que conectan dominio de negocio
  con interfaz de usuario.

$ experience with microfrontends
> Arquitecté el sistema de microfrontends en YouForce —
  web components con Stencil y Shadow DOM para encapsulación
  de estilos y deploys independientes.

$ why signals over ngrx
> Prefiero un enfoque funcional. Con NgRx el boilerplate no
  justificaba el beneficio en apps medianas. Signals me dio
  estado predecible y testable con menos complejidad.
```

## Stack técnico
- **TUI dev:** Node.js + Ink (React para terminal)
- **Entrevista:** Claude API (Anthropic SDK)
- **Indexación:** Node.js + git blame + Cloudflare AI API
- **Backend:** Cloudflare Worker (TypeScript)
- **Vector DB:** Cloudflare Vectorize
- **LLM:** Claude API (Anthropic)
- **Web TUI recruiter:** HTML + CSS + Vanilla JS (estética terminal)

## Fuera de scope (para después)
- OAuth con GitHub/GitLab (multi-usuario)
- Dashboard para gestionar repos
- Múltiples candidatos
- Billing/Stripe
- `npx create-portfolio-agent` para onboarding
