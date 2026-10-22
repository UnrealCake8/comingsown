# Mao V2 migration — vercel-build

## Status
- React + TypeScript + Vite frontend
- Supabase Auth email/password
- Vercel API handlers for Mao application data
- Isolated `mao` schema in Supabase project `zwwvlkokiwkyzyuzucxe`
- Spaces, memberships, friends, messages, VM assignments, Restricted Video preferences
- LiveKit audio/video room joining
- Existing Linux desktops stay on the Mac at `vmN.asanib.com`

## Vercel configuration
Create a Vercel project from branch `vercel-build`, using the Vite preset. Configure:
- `VITE_SUPABASE_URL=https://zwwvlkokiwkyzyuzucxe.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (safe for client)
- `SUPABASE_URL=https://zwwvlkokiwkyzyuzucxe.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase secret (NEVER prefix with VITE_)
- `LIVEKIT_URL` — LiveKit Cloud WebSocket URL
- `LIVEKIT_API_KEY` — server-only
- `LIVEKIT_API_SECRET` — server-only

Supabase API settings must include `mao` in **Exposed schemas** for the server's PostgREST requests. Do not expose the private `mao_internal` schema. `mao` RLS is enabled and table privileges are restricted. The server uses service credentials only after validating a Supabase access token and checking Space membership. Do not commit keys.

Configure Supabase Auth site URL and redirect allowlist for the Vercel preview and eventual `mao.asanib.com`.

## Existing users
Old Mao accounts use local username/passcode with bcrypt in Mac `data/state.json`. They are NOT migrated automatically. Never upload this JSON or password hashes to GitHub. A separate trusted migration process is required to create Auth users, map legacy user IDs to new Supabase IDs, and preserve friends, Spaces, messages and VM assignments. Back up the original file before migration.

## Restricted Video safety
A user's `restricted_video` flag and whitelist are stored in Supabase. **For now, the client refuses to enable the camera when Restricted Video is on.** This prevents accidental public video but does NOT yet implement whitelist-only video streaming. The next step is to add publisher track subscription permissions, synchronized for late joiners and whitelist changes, and test them with two browsers. Do not describe this feature as fully deployed until verified.

## Other limitations
- Message refresh currently uses polling; Supabase Realtime subscriptions still need wiring.
- VM assignment is intentionally administrator-managed; new accounts receive no VM automatically.
- VM iframe access relies on the security of the existing Mac VM endpoints.
- The old Node.js server remains for reference but is not deployed by Vercel.
- No production domain switch until staging and call/privacy tests pass.
