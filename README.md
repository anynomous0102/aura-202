AURA — Automated Utility and Response Agent

> A unified AI aggregator platform that routes user queries to multiple large language models simultaneously — GPT-4, Gemini, DeepSeek, and Claude — through a single interface, with side-by-side response comparison.

**Version:** 0.2 (active development — Stage 3 of 4)

---

## What this does

AURA eliminates the need to context-switch between separate AI tools. Users type one query and get responses from multiple models rendered simultaneously in a tabbed interface, making it easy to compare outputs, writing styles, and reasoning quality across models.

---

## Core features

| Feature | Description |
|---------|-------------|
| Multi-model routing | Dispatches queries to Gemini, ChatGPT, DeepSeek, Claude in parallel |
| Side-by-side comparison | Tabbed response panes — one per model |
| Image input support | Attach images to queries via file upload or Google Drive |
| Identity management | Login system with Google, Microsoft, GitHub OAuth flow |
| Sidebar model selector | Toggle which models to query per session |
| Typewriter rendering | Streamed response display with animated output |
| Cookie consent + session | Persistent login state via localStorage |

---

## Architecture

```
Frontend (ReactJS / HTML + CSS + JS)
    └── Input layer → model selector → submit

API Layer (Node.js backend)
    └── /api/gemini → Gemini 1.5 Flash
    └── [extensible to additional model endpoints]

Response normalisation
    └── Unified schema across providers
    └── Parallel Promise.all() dispatch
    └── Typewriter rendering per pane
```

---

## Tech stack

- **Frontend:** HTML5 · CSS3 · Vanilla JavaScript (v0.1–0.2) → migrating to ReactJS + Next.js (v0.3)
- **Backend:** Node.js · FastAPI (Python)
- **AI APIs:** Google Gemini 1.5 Flash · OpenAI GPT-4 · Anthropic Claude · DeepSeek
- **Auth:** Google OAuth · Microsoft OAuth · GitHub OAuth

---

## Current status

| Stage | Status | Description |
|-------|--------|-------------|
| Stage 1 | Done | Core UI + Gemini integration |
| Stage 2 | Done | Multi-model routing + tab system |
| Stage 3 | **In progress** | Backend security hardening, API key isolation, eval framework |
| Stage 4 | Planned | Full ReactJS migration + deployment |

---

## Research component

Evaluating response quality across models using **BLEU**, **ROUGE**, and human preference scoring on 500+ test prompts — methodology adapted from Google's FLAN and BIG-Bench evaluation frameworks.

---

## How to run (v0.2)

```bash
# Clone the repo
git clone https://github.com/anynomous0102/aura-202

# Add your Gemini API key in script.js
const GEMINI_API_KEY = "your_key_here";

# Open index.html in browser
# (Backend /api/gemini endpoint required for production use)
```

Get a free Gemini API key at: https://aistudio.google.com/

---

## Topics

`llm` `ai-aggregator` `multi-model` `gemini` `gpt-4` `claude` `deepseek` `javascript` `nodejs` `fastapi` `react` `nlp` `chatbot` `google-ai`
