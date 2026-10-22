import { createHmac } from "node:crypto";
export function createZoomToken({
  key,
  secret,
  space,
  userId,
  now = Math.floor(Date.now() / 1000),
}) {
  if (!key || !secret) throw Error("Zoom Video SDK credentials not configured");
  const sessionName = "mao-" + space;
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    app_key: key,
    tpc: sessionName,
    role_type: 0,
    user_key: userId,
    version: 1,
    iat: now - 30,
    exp: now + 3600,
  });
  const signature = createHmac("sha256", secret)
    .update(header + "." + payload)
    .digest("base64url");
  return { token: header + "." + payload + "." + signature, sessionName };
}
