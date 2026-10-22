import test from "node:test";
import assert from "node:assert/strict";
import { claimVm } from "../server/vm-assignment.js";
function database(result) {
  return {
    schema(name) {
      assert.equal(name, "mao");
      return {
        rpc: async (name, args) => {
          assert.equal(name, "claim_vm");
          assert.deepEqual(args, { p_user_id: "verified-user" });
          return result;
        },
      };
    },
  };
}
test("the API claims using the verified user ID and returns a VM number", async () => {
  assert.equal(
    await claimVm(database({ data: 18, error: null }), "verified-user"),
    18,
  );
});
test("an empty pool returns null rather than failing registration", async () => {
  assert.equal(
    await claimVm(database({ data: null, error: null }), "verified-user"),
    null,
  );
});
test("invalid database assignments are rejected", async () => {
  for (const data of [0, -1, 1.5, "18", undefined])
    await assert.rejects(
      () => claimVm(database({ data, error: null }), "verified-user"),
      /Invalid desktop assignment/,
    );
});
test("database setup errors remain errors rather than looking like a full pool", async (t) => {
  t.mock.method(console, "error", () => {});
  await assert.rejects(
    () =>
      claimVm(
        database({ data: null, error: { code: "PGRST202" } }),
        "verified-user",
      ),
    /database setup/,
  );
});
