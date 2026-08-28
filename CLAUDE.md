# PilotPathway.ai — Flight Training Platform

## What this is
Adaptive AI Private Pilot ground school for underserved students (Black, Latino, low-income youth).
Digital evolution of Fly Compton Foundation. Part 141-style structure.
Human CFIs still do real flight time and endorsements. AI is the ground instructor + progress coach.

## Current sprint (through Aug 31, 2026)
Build a working prototype:
1. Student signup / login
2. Curriculum outline (Stages 1–3)
3. Stage 1 AI Flight Instructor chat
4. Basic progress tracking
5. Student dashboard
6. Deploy to Vercel

Do NOT build in this sprint: VR, live flight-school booking, full mentorship hub, payments.

The existing Replit app (mentorship-hub.replit.app) is a PITCH DEMO only. Do not copy that codebase. We will rebuild mentorship later in this app.

## Stack (do not change)
- Next.js 15 App Router + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres)
- Anthropic Claude API for the AI tutor
- pnpm
- Deploy on Vercel

## Conventions
- Server Components by default. Add "use client" only when needed.
- Named exports except page.tsx and layout.tsx.
- No `any`.
- Keep FAA standards exact. Cultural adaptation is examples, tone, belonging — not watered-down ACS.
- AI tutor must cite PHAK / AFH / AIM / ACS style sources. Never invent regulations.
- If unsure about a regulation, say "confirm with your CFI and the current FAA handbook."

## Product rules
- Target student: ages 16–26, first-gen, cost-sensitive, needs belonging + clear next steps.
- Voice: encouraging, professional, not corporate, not slang-heavy.
- Free core ground school. Progress must be visible.
- Stage 1 first: Foundations & Pre-Solo.

## AI Instructor
- Captain Path lives in src/lib/tutor.ts and src/lib/instructor/*
- Never weaken ACS to be "inclusive." Inclusion is examples, tone, access, history cards.
- History only from history-cards.ts unless a new reviewed card is added.
- Latimer.ai is a future RAG partner, not the CFI.
- Model is claude-sonnet-5. It rejects `temperature`, `top_p`, and `top_k` with a 400 — do not add them.
- ACS Areas of Operation are referenced BY NAME, never by task code. Task codes are
  revision-specific and easy to get subtly wrong; a student showing a DPE a bad code
  pays for our mistake. Same rule for handbook chapter numbers.

## Commands
- pnpm dev
- pnpm build
- pnpm lint
