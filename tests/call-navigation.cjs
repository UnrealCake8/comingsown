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
  async function screenshot(name) {
    if (process.env.MAO_SCREENSHOT_DIR) {
      await require("node:fs/promises").mkdir(process.env.MAO_SCREENSHOT_DIR, {
        recursive: true,
      });
      await page.screenshot({
        path: require("node:path").join(
          process.env.MAO_SCREENSHOT_DIR,
          name + ".png",
        ),
        fullPage: true,
      });
    }
  }
  const errors = [];
  page.on("dialog", async (dialog) => {
    errors.push("Unexpected native dialog");
    await dialog.dismiss();
  });
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
      body: `
const initial=[{id:'one',name:'The hangout',owner_id:'me'},{id:'two',name:'After school',owner_id:'me'}];
let spaces=window.emptySpaces?[]:initial;
let links=[{requester_id:'me',addressee_id:'alice',status:'accepted'}];
export const supabase={auth:{signOut:async()=>{}}};
export async function request(path,body){
 if(path==='/bootstrap')return {profile:{username:'hammad',restricted_video:false},spaces,vm:('vmFixture' in window?window.vmFixture:1)};
 if(path==='/vm/claim')return {vm:window.vmClaim??null};
 if(path==='/spaces'){if(body.name==='fail')throw Error('Please choose another name');const space={id:'new-space',name:body.name,owner_id:'me'};spaces=[...spaces,space];return {space}};
 if(path.startsWith('/invite/')){if(body.username!=='alice')throw Error('Friends only');return {ok:true}};
 if(path==='/friends'&&body){if(body.username==='ghost')throw Error('User not found');links=[...links,{requester_id:'me',addressee_id:body.username,status:'pending'}];return {ok:true}};
 if(path.startsWith('/messages/'))return {messages:[]};
 if(path.startsWith('/call/'))return {token:'mock',sessionName:'mao-'+path.split('/').pop(),displayName:'hammad'};
 if(path==='/friends')return {links,people:[{user_id:'alice',username:'alice'},{user_id:'bob',username:'bob'}]};
 return {ok:true}
}`,
    }),
  );
  await page.context().route("https://vm*.asanib.com/**", (route) =>
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
  await screenshot("pc-desktop");
  const desktopBounds = await page.locator(".desktop-frame").boundingBox();
  assert(
    desktopBounds.y < 250 && desktopBounds.height > 500,
    "PC must be prominent and usable above the fold",
  );
  await page.getByRole("button", { name: "Focus PC", exact: true }).click();
  assert(
    (await page.locator(".desktop-frame").boundingBox()).height >
      desktopBounds.height,
    "focus increases PC area",
  );
  await page.getByRole("button", { name: "Exit focus", exact: true }).click();
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
  // The dock expands media without unmounting the call.
  await page.getByRole("button", { name: "Show video", exact: true }).click();
  await page.getByRole("button", { name: "Hide video", exact: true }).click();
  const popupPromise = page.context().waitForEvent("page");
  await page
    .getByRole("button", { name: "Open in a new tab", exact: true })
    .click();
  const pcPopup = await popupPromise;
  await page
    .getByRole("heading", { name: "Your PC is open in another tab" })
    .waitFor();
  assert.equal(
    await page.getByTitle("Your Linux desktop").count(),
    0,
    "embedded PC must be suspended during pop-out",
  );
  await pcPopup.waitForURL("https://vm1.asanib.com/");
  assert((await pcPopup.locator("body").innerText()).includes("Mock desktop"));
  await pcPopup.reload();
  await page
    .getByRole("button", { name: "Resume here", exact: true })
    .last()
    .click();
  await pcPopup.close();
  await page.getByTitle("Your Linux desktop").waitFor({ state: "visible" });
  const resumedFrame = await page
    .getByTitle("Your Linux desktop")
    .elementHandle();
  await page.evaluate(() => {
    window.realOpen = window.open;
    window.open = () => null;
  });
  await page
    .getByRole("button", { name: "Open in a new tab", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Your browser blocked the new tab" })
    .waitFor();
  assert(
    await resumedFrame.evaluate((el) => el.isConnected),
    "blocked pop-out must preserve desktop",
  );
  await page.evaluate(() => {
    window.open = window.realOpen;
  });
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await page.getByTitle("Your Linux desktop").waitFor({ state: "visible" });
  assert.deepEqual(
    await page.evaluate(() => window.callStats),
    { join: 1, leave: 0, audio: 1 },
    "PC controls must preserve the call",
  );
  await page
    .getByRole("button", { name: "Customise Space", exact: true })
    .click();
  await page.getByRole("button", { name: "Icon Gaming", exact: true }).click();
  await page.getByRole("button", { name: "mint", exact: true }).click();
  await screenshot("space-dialog");
  await page.getByRole("button", { name: "Save look", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "After school", exact: true })
      .getAttribute("data-tone"),
    "mint",
  );
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
  await page.getByRole("button", { name: "My PC", exact: true }).click();
  await screenshot("pc-mobile");
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile PC overflow",
  );
  // Styling is account-scoped and survives reload; onboarding never offers a disabled chat composer.
  await page.reload();
  await page
    .getByRole("button", { name: "After school", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "After school", exact: true })
      .getAttribute("data-tone"),
    "mint",
  );
  await page.addInitScript(() => {
    window.emptySpaces = true;
  });
  await page.reload();
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByRole("heading", { name: "Give your chat a home" }).waitFor();
  assert.equal(
    await page.getByRole("textbox", { name: "Message", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "New space", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Space name", exact: true })
    .fill("fail");
  await page.getByRole("button", { name: "Create Space", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "Please choose another name" })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Space name", exact: true })
    .fill("Weekend crew");
  await page.getByRole("button", { name: "Icon Rocket", exact: true }).click();
  await page.getByRole("button", { name: "sky", exact: true }).click();
  await page.getByRole("button", { name: "Create Space", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("button", { name: "Weekend crew", exact: true })
      .getAttribute("data-tone"),
    "sky",
  );
  await page
    .getByRole("button", { name: "Invite a friend", exact: true })
    .click();
  await page.getByRole("button", { name: "@alice", exact: true }).click();
  await page.getByRole("button", { name: "Send invite", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Friend invited" })
    .waitFor();
  await page.getByRole("button", { name: "Friends", exact: true }).click();
  await page.getByRole("button", { name: "Add a friend", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Friend’s username", exact: true })
    .fill("ghost");
  await page
    .getByRole("button", { name: "Send friend request", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "User not found" })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Friend’s username", exact: true })
    .fill("bob");
  await page
    .getByRole("button", { name: "Send friend request", exact: true })
    .click();
  await page.getByText("Request sent", { exact: true }).waitFor();
  // A full pool must not block calling; claiming newly added capacity keeps the call alive.
  await page.addInitScript(() => {
    window.emptySpaces = false;
    window.vmFixture = null;
    window.vmClaim = null;
  });
  await page.reload();
  await page.getByRole("button", { name: "Join the call" }).click();
  await page.getByRole("button", { name: "Enable audio" }).click();
  await page.getByRole("button", { name: "My PC", exact: true }).click();
  await page
    .getByRole("heading", { name: "All PCs are taken right now" })
    .waitFor();
  await page.getByRole("button", { name: "Check for a PC" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "All PCs are still taken" })
    .waitFor();
  await page.evaluate(() => {
    window.vmClaim = 18;
  });
  await page.getByRole("button", { name: "Check for a PC" }).click();
  await page.getByTitle("Your Linux desktop").waitFor({ state: "visible" });
  assert.equal(
    await page.getByTitle("Your Linux desktop").getAttribute("src"),
    "https://vm18.asanib.com",
  );
  assert.deepEqual(await page.evaluate(() => window.callStats), {
    join: 1,
    leave: 0,
    audio: 1,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: PC-first layout, focus, pop-out suspension/resume/reload, popup blocking, reconnect, persistent call controls/audio, onboarding, styled create/invite/friend forms with errors, saved Space looks, capacity retry, and mobile layout. Mock SDK and account data used.",
  );
  await browser.close();
  server.kill();
})().catch(async (e) => {
  console.error(e);
  await globalThis.testBrowser?.close();
  process.exit(1);
});
