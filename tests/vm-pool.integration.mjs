// PGlite runs actual PostgreSQL SQL/PLpgSQL in one isolated WASM backend.
// This validates allocation and permissions, not contention across server sessions.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const engine = new PGlite();
const admin = {
  query: async (sql, args) =>
    args
      ? engine.query(sql, args)
      : (await engine.exec(sql)).at(-1) || { rows: [] },
};
async function queryAsService(sql, params = []) {
  return engine.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return tx.query(sql, params);
  });
}
try {
  await admin.query(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema mao;
 create table mao.profiles(user_id uuid primary key);
 create table mao.vm_assignments(user_id uuid primary key references mao.profiles(user_id),vm_number integer not null);
 alter table mao.profiles enable row level security;
 alter table mao.vm_assignments enable row level security;
 grant insert,select on mao.profiles to service_role;
 `);
  const legacy = randomUUID();
  await admin.query("insert into mao.profiles values($1)", [legacy]);
  await admin.query("insert into mao.vm_assignments values($1,99)", [legacy]);
  const sql = await readFile(
    new URL("../supabase/setup-vm-pool.sql", import.meta.url),
    "utf8",
  );
  await admin.query(sql);
  await admin.query(sql);
  await admin.query(
    "insert into mao.vm_pool(vm_number,enabled) values(1,true),(18,true),(20,true),(99,true),(2,false)",
  );
  const users = Array.from({ length: 10 }, () => randomUUID());
  await Promise.all(
    users.map((id) =>
      queryAsService("insert into mao.profiles values($1)", [id]),
    ),
  );
  let assignments = (
    await admin.query("select * from mao.vm_assignments order by vm_number")
  ).rows;
  assert.deepEqual(
    assignments.map((a) => a.vm_number),
    [1, 18, 20, 99],
  );
  assert.equal(assignments.find((a) => a.user_id === legacy).vm_number, 99);
  assert.equal(
    Number(
      (await admin.query("select count(*) from mao.profiles")).rows[0].count,
    ),
    11,
    "pool exhaustion must not block registration",
  );
  const assigned = assignments.find((a) => a.vm_number === 18).user_id;
  await admin.query("update mao.vm_pool set enabled=false where vm_number=18");
  const repeats = await Promise.all(
    Array.from({ length: 20 }, () =>
      queryAsService("select mao.claim_vm($1) as vm", [assigned]),
    ),
  );
  assert(
    repeats.every((r) => r.rows[0].vm === 18),
    "same user must keep one stable VM",
  );
  const waiting = users.find(
    (id) => !assignments.some((a) => a.user_id === id),
  );
  assert.equal(
    (await queryAsService("select mao.claim_vm($1) as vm", [waiting])).rows[0]
      .vm,
    null,
  );
  await admin.query("insert into mao.vm_pool(vm_number) values(21)");
  const retries = await Promise.all(
    Array.from({ length: 20 }, () =>
      queryAsService("select mao.claim_vm($1) as vm", [waiting]),
    ),
  );
  assert(
    retries.every((r) => r.rows[0].vm === 21),
    "concurrent retries must claim only one new VM",
  );
  assignments = (await admin.query("select * from mao.vm_assignments")).rows;
  assert.equal(assignments.filter((a) => a.user_id === waiting).length, 1);
  const other = users.find(
    (id) => id !== waiting && !assignments.some((a) => a.user_id === id),
  );
  assert.equal(
    (await queryAsService("select mao.claim_vm($1) as vm", [other])).rows[0].vm,
    null,
  );
  await assert.rejects(
    () => queryAsService("select mao.claim_vm($1)", [randomUUID()]),
    /Mao profile required/,
  );
  for (const role of ["anon", "authenticated"]) {
    await admin.query("set role " + role);
    await assert.rejects(
      () => admin.query("select mao.claim_vm($1)", [assigned]),
      /permission denied/,
    );
    await assert.rejects(
      () => admin.query("select * from mao.vm_pool"),
      /permission denied/,
    );
    await admin.query("reset role");
  }
  const permissions = (
    await admin.query(
      "select has_function_privilege('authenticated','mao.claim_vm(uuid)','EXECUTE') as browser_rpc, has_table_privilege('anon','mao.vm_pool','SELECT') as anonymous_pool",
    )
  ).rows[0];
  assert.equal(permissions.browser_rpc, false);
  assert.equal(permissions.anonymous_pool, false);
  await assert.rejects(
    () =>
      queryAsService(
        "insert into mao.vm_assignments(user_id,vm_number) values($1,1)",
        [other],
      ),
    /duplicate key/,
  );
  await assert.rejects(
    () =>
      queryAsService(
        "insert into mao.vm_assignments(user_id,vm_number) values($1,200)",
        [assigned],
      ),
    /duplicate key/,
  );
  const flags = (
    await admin.query(
      "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mao' and c.relname='vm_pool'",
    )
  ).rows;
  assert.equal(flags[0].relrowsecurity, true);
  console.log(
    "PASS: PostgreSQL/PGlite — registration, unique/stable assignments, full pool, disabled VMs, existing assignments, capacity retry, idempotent setup, RLS and denied client access. Single backend; production multi-session contention is not tested.",
  );
} finally {
  await engine.close();
}
