import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createZoomToken } from "../server/zoom-token.js";
test("Zoom JWT binds a participant to the authorized space and identity with a bounded expiry", () => {
  const { token, sessionName } = createZoomToken({
    key: "test-key",
    secret: "test-secret",
    space: "private-room",
    userId: "member-1",
    now: 10000,
  });
  const [header, payload, signature] = token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), {
    alg: "HS256",
    typ: "JWT",
  });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), {
    app_key: "test-key",
    tpc: "mao-private-room",
    role_type: 0,
    user_key: "member-1",
    version: 1,
    iat: 9970,
    exp: 13600,
  });
  assert.equal(sessionName, "mao-private-room");
  assert.equal(
    signature,
    createHmac("sha256", "test-secret")
      .update(header + "." + payload)
      .digest("base64url"),
  );
  assert(!token.includes("test-secret"));
});
test("missing credentials fail without issuing a token", () => {
  assert.throws(
    () => createZoomToken({ key: "key", space: "room", userId: "user" }),
    /credentials not configured/,
  );
});
