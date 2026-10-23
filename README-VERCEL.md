# Mao — hang out, chat, and use your PC

React + TypeScript + Vite frontend, Supabase sign-in and social data, and Zoom Video SDK calls. The existing Mao logo reference (`public/mao-logo.png`) and wordmark are retained. The image file is not currently tracked in this repository; place the original asset at that path to display it.

## Setup

1. Install Node 22+ and run `npm ci`.
2. Copy `.env.example` to `.env` and fill in the existing Supabase project values and your **Zoom Video SDK** app key and secret. Meeting SDK credentials cannot be used.
3. For a complete local app, run `npm run build` then `npm start` (http://127.0.0.1:4000). `npm run dev` runs only the frontend; the authenticated API needs the Node server or Vercel.
4. On Vercel, use Vite, `npm run build`, and output directory `dist`. Configure the same variables there, then redeploy. `VITE_` values are baked into the build. Zoom credentials and the Supabase service-role key must remain server-only.

Existing `mao` schema tables and VM assignments are retained. Before deploying the automatic VM feature, run `supabase/setup-vm-pool.sql` in the Supabase SQL Editor (see `supabase/README.md`). Calls authenticate through `/api/mao/call/:space`, verify Supabase identity and Space membership, and receive a one-hour HS256 Zoom session JWT. All users join as participants, so no host privileges or recording controls are granted by the token endpoint.

## Calls and desktops

Click **Join the call**, then **Enable audio** to connect your microphone and speakers using an explicit browser gesture. Camera, mute, screen share, received video, and leave controls use Zoom Video SDK. Call errors and browser autoplay recovery are surfaced in the call panel.

The call component stays mounted when switching between Hang out, My PC, Chat, Friends, and Privacy. Selecting a different Space preserves the current call until you leave. The desktop iframe also stays mounted during navigation. Desktop pop-out opens another tab; keep the Mao tab open for audio. Reloading, closing the Mao tab, or signing out ends the call. Mobile operating systems may suspend background tabs; uninterrupted audio cannot be guaranteed when the browser is suspended.

Restricted Video keeps camera publishing disabled. Per-viewer whitelist delivery is not implemented; screen shares are visible to all call participants. This restriction is an application control, not a Zoom token-level publish prohibition.

For real calling, verify with two signed-in Space members on HTTPS, grant browser mic/camera permissions, and allow Zoom media traffic through the network. Confirm two-way audio while navigating to My PC, camera video in both directions, screen sharing and browser stop-share, reconnect, leave, and sign-out. No Zoom credentials are included in the repository.

The older `server.js` and `public/app.js` are legacy implementations; the supported app runs through `server.mjs` or Vercel.

## Checks

- `npm test` checks Zoom JWT signatures, session/user binding, expiry, and missing credentials.
- `npx playwright install chromium` then `npm run test:ui` checks responsive navigation, call persistence, mute/leave, and preservation of the VM iframe with **mocked account data and Zoom SDK**. Set `CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium instead. These checks do not verify real Zoom media transport.
- `npm run build` checks TypeScript and the production bundle. Supply `VITE_SUPABASE_PUBLISHABLE_KEY` to include the authenticated app in the build. The Zoom SDK is loaded only when joining a call.

- `npm run test:db` runs the SQL/PLpgSQL setup in a disposable PostgreSQL/PGlite database to check allocation, repeated requests, full pools, disabled VMs, existing assignments, and permissions. It never connects to Supabase. PGlite uses one backend; production multi-session lock contention still needs staging verification.

## PC-first interface

My PC is the default view, with a compact header, a larger desktop, and a Focus PC toggle. Call controls stay in a small dock below the PC. Show video expands the media area without leaving or remounting the call; receiving a screen share also opens it.

Open in a new tab suspends the embedded desktop so the two views do not compete for the VM's primary connection. Resume here reconnects the embedded view; the separate PC tab can then be closed manually. The separate tab has no opener and cannot control the Mao tab. Popup blocking leaves the embedded desktop intact and displays an explanation. Reconnect view reloads only the PC iframe, retaining the apps running on the VM and the Mao call. Cross-origin VM pages do not expose reliable connection health to Mao; iframe loading is not presented as a health check.

Space creation, invitations, and friend requests use accessible in-app dialogs with validation and inline errors. Chat explains how to create a Space before showing its composer. Space icons/colours are personal display preferences stored in versioned local storage, scoped to the account and this browser. No new database migration is required.

See `VM-CHROME.md` for the confirmed VM1 Chrome launch failure and the remaining host-side work. This release does not claim to repair that container configuration or verify two-way Zoom audio.
