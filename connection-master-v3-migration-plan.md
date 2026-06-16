# Connection Master — V3 Migration & Improvement Plan

**From:** Single-file HTML prototype (v2)
**To:** Full-stack Vite + React + TypeScript + Supabase app (v3)
**Stack target:** VS Code · Vite · React 18 · TypeScript · Supabase (Postgres + Auth + Storage + RLS)

---

## 1. What v2 already does well (keep this)

The current prototype is further along than a typical prototype because the *hard part is already designed correctly*: **connections happen between ports, not parts.** Before touching anything, lock in what's working so the migration doesn't regress it.

- **Port-based data model.** Every part is an object with typed ports (`type`, `size`, `gender`, `thread`, `ferrule`, `sealant`, `side`). This is the right architecture and matches the original spec.
- **A real validation engine.** `validateConnection()` already classifies connections as valid / warn / invalid using compatibility checks: `typesCompatible`, `sizesCompatible`, `gendersCompatible`, `threadCompatible`, plus pressure-rating and gas-compatibility checks.
- **Assembly-level rules.** `getAllIssues()` already enforces system-level logic: source-requires-regulator, carrier-must-terminate-at-GC, open-port warnings, pressure-exceeded hard stops.
- **Operator deliverables.** It already generates a BOM, connection-by-connection steps, validation issues, a physical-check list, and a signoff block — i.e. the actual MVP-defined "build sheet."
- **Working canvas.** Drag parts, click-port-to-click-port edge creation, SVG edges with status colors, JSON export, localStorage save/load, sample build.

**Migration principle:** v3 is not a rewrite of the logic. It is *lifting the logic out of one file* into typed modules, then putting a database, auth, and persistence underneath it. The validation engine should move almost verbatim into a pure, testable TypeScript module.

---

## 2. Honest assessment of v2's limits (why migrate)

| Limitation in v2 | Consequence | v3 fix |
|---|---|---|
| Parts hard-coded in a JS array | No admin/library mode; every part change is a code edit | Move to `parts` + `part_ports` tables, admin CRUD UI |
| State in one global object + localStorage | No multi-user, no traceability, no audit trail, data dies with the browser | Supabase Postgres + per-user/per-org rows |
| No auth or roles | Can't separate Operator / Lab Manager / QA / Auditor | Supabase Auth + RLS + a `role` claim |
| Validation logic interleaved with DOM rendering | Hard to test, hard to extend the rules engine | Pure `engine/` module, unit-tested, no DOM |
| Hand-rolled canvas + manual edge math | Brittle; reinvents pan/zoom/snap; resize re-render bugs | React Flow (already recommended in the spec) |
| Report is `innerHTML` string | No real PDF, no stored build record | Server-stored build records + proper export |
| No inventory, instruments, approvals | Can't reach MVP 4 / approval workflow | Dedicated tables + workflow state machine |

---

## 3. Target architecture

```
connection-master/
├─ src/
│  ├─ engine/                 # PURE logic, no React, no DOM — the crown jewels
│  │  ├─ types.ts             # Part, Port, Node, Edge, Assembly, ValidationResult
│  │  ├─ compatibility.ts     # typesCompatible, sizesCompatible, gendersCompatible, threadCompatible
│  │  ├─ validateConnection.ts
│  │  ├─ validateAssembly.ts  # getAllIssues equivalent (system-level rules)
│  │  ├─ bom.ts               # getBOM
│  │  ├─ buildSheet.ts        # getConnectionSteps + required checks
│  │  └─ __tests__/           # Vitest — every rule gets a test
│  ├─ features/
│  │  ├─ canvas/              # React Flow wrapper, custom PartNode, port handles
│  │  ├─ toolbox/             # searchable part palette (reads from Supabase)
│  │  ├─ inspector/           # right-hand properties panel
│  │  ├─ buildsheet/          # report modal + export
│  │  ├─ library-admin/       # Admin mode: part + rule CRUD
│  │  └─ approvals/           # QA / approval workflow
│  ├─ data/                   # Supabase client + typed queries (one file per table)
│  │  ├─ supabase.ts
│  │  ├─ parts.ts
│  │  ├─ assemblies.ts
│  │  └─ ...
│  ├─ hooks/                  # useAssembly, useParts, useAuth, useRealtimeAssembly
│  ├─ pages/                  # routes: /builder, /library, /assemblies, /review
│  └─ app/                    # router, providers, layout
├─ supabase/
│  ├─ migrations/             # SQL schema, versioned
│  └─ seed.sql                # seed PART_LIBRARY from v2
├─ .env.local                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└─ vite.config.ts
```

**Key decision — the `engine/` boundary.** The engine takes plain data in and returns plain results. It never imports React, Supabase, or the DOM. This means: (a) you can unit-test every safety rule, (b) the same engine runs in the browser for live feedback *and* could run server-side later to validate before a build record is approved, and (c) when you add a rule, you add a test, not a console check.

---

## 4. Database schema (Supabase / Postgres)

This is the spec's recommended table list, made concrete. Start with the **bold** tables; the rest come in later phases.

**Core (Phase 1–2):**
- **`parts`** — `id, slug, name, manufacturer, part_number, category, material, max_pressure_psig, max_temp_f, gases text[], cleanliness_class, reusable, sop_url, icon, notes, org_id, approved bool, created_by, created_at`
- **`part_ports`** — `id, part_id fk, port_key, label, type, size, gender, thread, tube_od, flow_direction, sealant_rule, ferrule_required bool, gasket_required bool, cap_allowed bool, side`
- **`assemblies`** — `id, name, status (draft|validated|in_review|approved|active|retired), gas, service, max_operating_pressure_psig, instrument_id fk, org_id, created_by, approved_by, version, created_at, updated_at`
- **`assembly_nodes`** — `id, assembly_id fk, part_id fk, node_key, label, x, y, length_ft, custom jsonb`
- **`assembly_connections`** — `id, assembly_id fk, from_node, from_port, to_node, to_port, validation_cached`

**Rules & control (Phase 2–3):**
- **`connection_rules`** — optional table to make the rules engine data-driven (gender pairings, type pairings, prohibited combos) instead of hard-coded. Lets Admin mode lock down unsafe adapters without a deploy.
- `gas_services` — gas → allowed materials, CGA, color-code mapping
- `instruments` — `asset_id, model, location, ports`
- `inventory_items` — `part_id, location, on_hand, reorder_point, vendor, last_verified`

**Traceability (Phase 3–4):**
- `inspection_records` — leak-check, pressure record, photos, completed_by, completed_at
- `approvals` — assembly_id, reviewer, decision, comments, signed_at
- `attachments` — Supabase Storage refs (photos, SOP PDFs, build diagrams)
- `change_log` — who changed what, when (audit)
- `users` / `profiles` — role, org_id (mirrors Supabase auth.users)

**Row-Level Security from day one.** Even in Phase 1, turn on RLS. Start simple: a row is readable/writable by its `created_by` (and later its `org_id`). Retrofitting RLS after you have data is painful; starting with it is cheap.

---

## 5. Roles & RLS model

| Role | Can do |
|---|---|
| **Operator** | Build/draft assemblies, run validation, generate build sheets, complete checklists, upload photos |
| **Lab Manager** | Everything Operator + add/edit approved parts, define rules, approve assemblies |
| **QA Reviewer** | Read all, review warnings, sign off, export build records |
| **Auditor (read-only)** | Read assemblies, records, approvals, change log |
| **Admin** | Manage users, lock/unlock parts, org settings |

Implement role as a custom claim on the JWT (via a `profiles.role` column + a Supabase function), then write RLS policies that check it. Gate the UI on the same role so Admin/QA panels don't render for Operators.

---

## 6. Migration phases (mapped to the spec's MVP ladder)

### Phase 0 — Scaffold (½ day)
- `npm create vite@latest connection-master -- --template react-ts`
- Add: `@xyflow/react` (React Flow), `@supabase/supabase-js`, `zustand` (or React Query) for state, `vitest` + `@testing-library/react`, `react-router-dom`.
- Set up Supabase project, drop in `.env.local`, commit `supabase/migrations/0001_init.sql`.
- **Exit criteria:** app boots, connects to Supabase, one route renders.

### Phase 1 — Lift the engine + parts to the DB (MVP 1)
- Port `PART_LIBRARY` → `parts` + `part_ports` rows via `seed.sql`. Write a one-time script that reads the v2 array and emits INSERTs (keeps the data you already curated).
- Move `validateConnection`, the four `*Compatible` helpers, `getBOM`, `getConnectionSteps`, `getAllIssues` into `src/engine/` as pure TS with real types. **Write Vitest tests for each rule as you port it** — this is where the prototype's correctness gets locked in.
- Rebuild the canvas on **React Flow**: a custom `PartNode` renders the SVG icon + port handles; React Flow handles drag, pan, zoom, snap, and edge creation (replacing the manual click-port logic and the resize re-render workaround).
- Toolbox reads parts from Supabase. Assemblies save to Supabase instead of localStorage (keep a localStorage *draft* cache as offline fallback).
- **Exit criteria:** you can build the existing sample carrier-gas line from DB parts, it validates identically to v2, and it persists to Postgres.

### Phase 2 — Validation engine, hardened & data-driven (MVP 2)
- Add the spec's hard-stop rules that v2 doesn't fully cover yet: CGA mismatch as a hard stop, quick-connect plug/socket enforcement (partially there), dead-end-without-vent logic, material-incompatible-with-gas, wrong-gas-to-wrong-GC-line.
- Add **smart adapter suggestions**: when a connection is blocked on size/thread, query `parts` for an approved adapter whose two ports bridge the gap, and surface "Suggested approved adapter: …". This is the feature that turns it into a training tool.
- Move gender/type pairings into `connection_rules` so Admin mode edits them without a deploy.
- **Exit criteria:** every hard-stop and warning rule from spec §6 has a test and fires in the UI.

### Phase 3 — Operator build sheet + records (MVP 3)
- Real export: render the build sheet to PDF (server function or client lib), and **store a build record** row rather than only printing.
- Leak-check checklist becomes a persisted `inspection_records` row with signature fields and photo upload to Supabase Storage.
- Generate assembly label/tag data + QR code that deep-links to the stored build record.
- **Exit criteria:** an operator completes a build, signs off, uploads a photo, and the whole record is retrievable by QR.

### Phase 4 — Inventory + instruments + approvals (MVP 4 + workflow)
- `instruments`, `inventory_items` tables + UI; parts show in-stock / location / reorder.
- Approval workflow state machine: `draft → validated → in_review → approved → active → retired`, with `approvals` signoffs and RLS gating who can advance state.
- Admin "lock unsafe adapter" capability.
- **Exit criteria:** an assembly can travel the full lifecycle with the right roles signing each gate.

### Phase 5 — AI assist (MVP 5, last)
- "Build me a line from X to Y" assistant that proposes a node/edge graph, which the **rules engine then validates** (AI suggests, the engine decides — keep that boundary).
- SOP lookup, troubleshooting mode, optional photo-based fitting ID.

---

## 7. Concrete first-week task list (VS Code + Supabase)

1. Scaffold Vite + React-TS; install deps; wire Supabase client (`src/data/supabase.ts`).
2. Write `0001_init.sql`: `parts`, `part_ports`, `assemblies`, `assembly_nodes`, `assembly_connections` + RLS on `created_by`. Run via Supabase CLI (`supabase db push`).
3. Write the v2→SQL seed script; load your existing 18-ish parts into the DB.
4. Create `src/engine/types.ts` and move the validation functions over with types; port the tests.
5. Stand up React Flow with a `PartNode` and port handles; render one node from a DB part.
6. Wire drag-from-toolbox → add `assembly_node`; edge create → `assembly_connection` → live `validateConnection`.
7. Replace localStorage save/load with Supabase upsert/select for assemblies (keep a local draft cache).

---

## 8. Things to explicitly NOT do yet (per spec §15)

Defer: full 3D CAD, automatic pressure-drop calculations, full P&ID complexity, deep LIMS integration, multi-site deployment, and required AI photo recognition. They're real later; they'll stall the migration now. The first win is unchanged from the original spec: **correctly tell a tech what pieces go together and what to check** — now backed by a database, auth, and a real build record.

---

## 9. Risks & gotchas during migration

- **Don't let the engine import anything stateful.** The single biggest value of this migration is the testable engine. If Supabase or React leaks into `engine/`, you lose that. Enforce it with an ESLint boundary rule if needed.
- **React Flow coordinate model differs from v2's absolute pixels.** Your stored `x,y` should be React Flow's node positions; migrate the sample build's coordinates once and verify visually.
- **RLS will "break" queries that worked in dev.** That's RLS doing its job. Test policies with a non-owner user early, not at the end.
- **Tube length / BOM math** lives in `getBOM` today — keep it in the engine so the BOM stays a pure function of the graph.
- **Validation caching:** store a cached validation status on `assembly_connections` for fast list rendering, but always recompute live in the builder — the engine is the source of truth, the cache is a convenience.

---

*Drafted by JJ's AI Assistant 🤖*
