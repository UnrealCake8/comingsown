const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const server = require("node:child_process").spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
    { cwd: require("node:path").resolve(__dirname, ".."), stdio: "ignore" },
  );
  process.on("exit", () => server.kill());
  for (let i = 0; i < 40; i++) {
    try {
      await fetch("http://127.0.0.1:5173");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox"],
        }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  globalThis.testBrowser = browser;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/src/entry.tsx", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `import React from '/node_modules/.vite/deps/react.js';import App from '/src/App.tsx';export default function Entry(){return React.createElement(App,{userId:'me'})}`,
    }),
  );
  await page.route("**/src/lib/supabase.ts", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export const supabase={auth:{signOut:async()=>{}}};export async function request(path,body){if(path==='/bootstrap')return {profile:{username:'hammad',restricted_video:false},spaces:[{id:'one',name:'The hangout',owner_id:'me'},{id:'two',name:'After school',owner_id:'me'}],vm:1};if(path.startsWith('/messages/'))return {messages:[]};if(path.startsWith('/call/'))return {token:'mock',sessionName:'mao-'+path.split('/').pop(),displayName:'hammad'};if(path==='/friends')return {links:[],people:[]};return {ok:true}}`,
    }),
  );
  await page.route("**/vm1.asanib.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<body style="background:#d1e3f4;font-family:sans-serif;padding:30px">Mock desktop</body>',
    }),
  );
  await page.route("**/*zoom*videosdk*.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.callStats={join:0,leave:0,audio:0};const listeners={};let muted=true,video=false;const stream={isAudioMuted:()=>muted,isCapturingVideo:()=>video,getActiveShareUserId:()=>0,startAudio:async()=>{window.callStats.audio++;muted=false},muteAudio:async()=>{muted=true},unmuteAudio:async()=>{muted=false},startVideo:async()=>{video=true},stopVideo:async()=>{video=false},attachVideo:async()=>document.createElement('video-player'),detachVideo:async()=>[],stopShareScreen:async()=>{},isStartShareScreenWithVideoElement:()=>true,startShareScreen:async()=>{}};const client={init:async()=>{},join:async()=>{window.callStats.join++},leave:async()=>{window.callStats.leave++},on:(e,f)=>{listeners[e]=f},off:e=>{delete listeners[e]},getAllUser:()=>[{userId:1,displayName:'hammad',bVideoOn:video,muted}],getCurrentUserInfo:()=>({userId:1}),getMediaStream:()=>stream};export default {createClient:()=>client};`,
    }),
  );
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "Join the call" }).waitFor();
  await page.getByRole("button", { name: "Join the call" }).click();
  await page.getByRole("button", { name: "Enable audio" }).click();
  await page.getByRole("button", { name: "My PC", exact: true }).click();
  await page.getByTitle("Your Linux desktop").waitFor({ state: "visible" });
  assert.deepEqual(await page.evaluate(() => window.callStats), {
    join: 1,
    leave: 0,
    audio: 1,
  });
  const iframe = await page.getByTitle("Your Linux desktop").elementHandle();
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByRole("button", { name: "My PC", exact: true }).click();
  assert(await iframe.evaluate((el) => el.isConnected), "VM iframe preserved");
  await page.getByRole("button", { name: "After school", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.callStats), {
    join: 1,
    leave: 0,
    audio: 1,
  });
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Unmute", exact: true }).waitFor();
  await page.getByRole("button", { name: "Hang out", exact: true }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: "Join the call" }).waitFor();
  assert.equal(await page.evaluate(() => window.callStats.leave), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile horizontal overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: navigation preserves Zoom session/audio and VM iframe; room selection preserves active call; mute/leave controls; desktop/mobile layout; no page errors. Mock SDK and account data used.",
  );
  await browser.close();
  server.kill();
})().catch(async (e) => {
  console.error(e);
  await globalThis.testBrowser?.close();
  process.exit(1);
});
