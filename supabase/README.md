# Automatic VM assignment

Run `setup-vm-pool.sql` once in the **existing Mao Supabase project's SQL Editor** before deploying the updated API. The script is transactional, safe to rerun, and preserves existing assignments. It expects the existing `mao.profiles(user_id)` and `mao.vm_assignments(user_id, vm_number)` tables. If existing assignments contain duplicate users or VM numbers, setup stops instead of silently changing them.

Then open **Table Editor → schema `mao` → table `vm_pool`**. For each provisioned desktop, add a row with its `vm_number` and leave `enabled = true`. For example, VM18 is `{vm_number: 18, enabled: true}` and opens `https://vm18.asanib.com`. Add only VM numbers that actually exist. There is no built-in VM1–VM20 range.

For multiple desktops, you can also use SQL (replace these examples with your actual available numbers):

```sql
insert into mao.vm_pool (vm_number)
values (1), (18), (20)
on conflict (vm_number) do nothing;
```

- Completing Mao's username registration creates a profile and automatically claims the lowest available, enabled VM in the same database transaction. Auth signups for other apps in the shared Supabase project do not reserve Mao desktops.
- Each user keeps the same VM on future sign-ins. Existing manual assignments stay in place, including numbers not in `vm_pool`.
- Database transaction locks and unique indexes prevent concurrent registrations/retries from assigning the same VM to two users or multiple VMs to one user.
- When full, registration still succeeds and My PC shows a waiting message. Adding capacity allows an unassigned user to claim on their next app load or by clicking **Check for a PC**. Adding a pool row does not push an assignment into an already-open browser automatically.
- Set `enabled = false` to stop allocating an unassigned VM. This does not revoke or replace an existing user's desktop.
- Only trusted server requests can call `mao.claim_vm`; browsers cannot list/change the pool or invoke the allocator. Keep `mao` exposed to PostgREST as in the existing setup and do not expose `mao_internal`.
- This allocates existing desktops. It does not create containers, configure VM passwords, or change the existing VM access controls. Reset a desktop and revoke its previous user's VM access before making it available for reuse.

Verification in SQL Editor (read-only):

```sql
select p.vm_number, p.enabled, a.user_id
from mao.vm_pool p
left join mao.vm_assignments a using (vm_number)
order by p.vm_number;
```

For local SQL allocation tests, run `npm run test:db`. The fixture schema is created only in a disposable PostgreSQL/PGlite database, never in the Supabase project. These tests use one backend and do not verify multi-session contention; verify simultaneous registrations in staging after applying the setup.
