alter table public.parts
add column if not exists scope text not null default 'lab'
check (scope in ('lab', 'field', 'shared'));

create index if not exists parts_scope_approved_category_idx
on public.parts (scope, approved, category, name);

create table public.field_rigups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Field Rig-Up',
  status text not null default 'draft' check (status in ('draft', 'validated', 'in_review', 'approved', 'active', 'retired')),
  customer_config jsonb not null default '{}'::jsonb,
  truck_config jsonb not null default '{}'::jsonb,
  operating_pressure_psig numeric not null default 150,
  notes text,
  graph jsonb not null default '{"nodes":[],"connections":[]}'::jsonb,
  org_id uuid,
  created_by uuid not null default auth.uid() references auth.users(id),
  approved_by uuid references auth.users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index field_rigups_created_by_updated_at_idx
on public.field_rigups (created_by, updated_at desc);

create trigger field_rigups_set_updated_at
before update on public.field_rigups
for each row execute function private.set_updated_at();

alter table public.field_rigups enable row level security;

revoke all on table public.field_rigups from anon;
grant select, insert, update, delete on table public.field_rigups to authenticated;

create policy "field rig-ups are visible to their owner"
on public.field_rigups
for select
to authenticated
using (created_by = (select auth.uid()));

create policy "field rig-ups can be inserted by their owner"
on public.field_rigups
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "field rig-ups can be updated by their owner"
on public.field_rigups
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "field rig-ups can be deleted by their owner"
on public.field_rigups
for delete
to authenticated
using (created_by = (select auth.uid()));
