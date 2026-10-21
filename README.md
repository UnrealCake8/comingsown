# Mao — your space, together

Self-hosted collaborative Webtop for macOS. Vanilla HTML/CSS/JavaScript frontend; Node.js backend; JSON accounts and permanent VM assignment; friends, rooms, realtime chat and peer-to-peer WebRTC voice signalling.

Run: `npm install && npm start`. Open `http://localhost:3000`. Point Cloudflare Tunnel `mao.asanib.com` to `http://localhost:3000`.

VMs must already exist at `https://vm1.asanib.com`, etc. Configure `VM_COUNT` (default 19). JSON persistence is local on the Mac, not GitHub. Secure each Webtop individually: opening its direct link bypasses Mao login. WebRTC works best with a TURN relay configured, which is not included. HTTPS is required for microphones on the public internet.

This is an early private-testing build, not a production-hardened multi-user service.