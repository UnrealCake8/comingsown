# Mao v2 — Vercel build

This branch introduces a React + TypeScript + Vite frontend and a new social-first interface.

## Local preview

```bash
npm install
npm run dev
```

## Vercel

Import `UnrealCake8/comingsown` and select branch `vercel-build`. Framework preset: Vite. Build command: `npm run build`; output directory: `dist`.

## Important

This is an **interactive design preview**, not a migrated production application. Spaces and messages are local React state only. Call controls do not access camera or microphone yet. There is no authentication, database, real-time chat, LiveKit integration, or VM embedding in this build. Do not attach the production mao.asanib.com domain until those features are implemented and tested.

The Linux VM hosts stay on the Mac; they are not being migrated. The previous Node/Express implementation remains in the repository for reference, but Vercel serves only the new Vite frontend.
