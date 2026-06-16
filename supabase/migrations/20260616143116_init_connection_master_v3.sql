create extension if not exists pgcrypto;

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'operator' check (role in ('operator', 'lab_manager', 'qa_reviewer', 'auditor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  manufacturer text not null default '',
  part_number text not null default '',
  category text not null,
  material text not null default '',
  max_pressure_psig numeric not null default 0,
  max_temp_f numeric,
  gases text[] not null default '{}',
  cleanliness_class text,
  reusable boolean not null default true,
  sop_url text,
  icon text not null default 'PRT',
  notes text,
  default_length_ft numeric,
  org_id uuid,
  approved boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.part_ports (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  port_key text not null,
  label text not null,
  type text not null,
  size text,
  gender text not null,
  thread text,
  tube_od text,
  flow_direction text,
  sealant_rule text,
  ferrule_required boolean not null default false,
  gasket_required boolean not null default false,
  cap_allowed boolean not null default false,
  side text not null check (side in ('left', 'right', 'top', 'bottom')),
  created_at timestamptz not null default now(),
  unique (part_id, port_key)
);

create table public.assemblies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Assembly',
  status text not null default 'draft' check (status in ('draft', 'validated', 'in_review', 'approved', 'active', 'retired')),
  gas text not null default 'Helium',
  service text not null default 'Carrier Gas',
  max_operating_pressure_psig numeric not null default 100,
  instrument_id uuid,
  org_id uuid,
  created_by uuid not null default auth.uid() references auth.users(id),
  approved_by uuid references auth.users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assembly_nodes (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  part_id uuid not null references public.parts(id),
  node_key text not null,
  label text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  length_ft numeric,
  tag text,
  notes text,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assembly_id, node_key)
);

create table public.assembly_connections (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  edge_key text not null,
  from_node text not null,
  from_port text not null,
  to_node text not null,
  to_port text not null,
  validation_cached jsonb,
  created_at timestamptz not null default now(),
  unique (assembly_id, edge_key)
);

create index parts_approved_category_idx on public.parts (approved, category, name);
create index part_ports_part_id_idx on public.part_ports (part_id);
create index assemblies_created_by_updated_at_idx on public.assemblies (created_by, updated_at desc);
create index assembly_nodes_assembly_id_idx on public.assembly_nodes (assembly_id);
create index assembly_connections_assembly_id_idx on public.assembly_connections (assembly_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger parts_set_updated_at
before update on public.parts
for each row execute function private.set_updated_at();

create trigger assemblies_set_updated_at
before update on public.assemblies
for each row execute function private.set_updated_at();

create trigger assembly_nodes_set_updated_at
before update on public.assembly_nodes
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'operator')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.parts enable row level security;
alter table public.part_ports enable row level security;
alter table public.assemblies enable row level security;
alter table public.assembly_nodes enable row level security;
alter table public.assembly_connections enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.parts from anon;
revoke all on table public.part_ports from anon;
revoke all on table public.assemblies from anon;
revoke all on table public.assembly_nodes from anon;
revoke all on table public.assembly_connections from anon;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.parts to authenticated;
grant select on table public.part_ports to authenticated;
grant select, insert, update, delete on table public.assemblies to authenticated;
grant select, insert, update, delete on table public.assembly_nodes to authenticated;
grant select, insert, update, delete on table public.assembly_connections to authenticated;

create policy "profiles are visible to their owner"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles can be inserted by their owner"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles can be updated by their owner"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "approved parts are visible to authenticated users"
on public.parts
for select
to authenticated
using (approved = true);

create policy "approved part ports are visible to authenticated users"
on public.part_ports
for select
to authenticated
using (
  exists (
    select 1
    from public.parts
    where parts.id = part_ports.part_id
      and parts.approved = true
  )
);

create policy "assemblies are visible to their owner"
on public.assemblies
for select
to authenticated
using (created_by = (select auth.uid()));

create policy "assemblies can be inserted by their owner"
on public.assemblies
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "assemblies can be updated by their owner"
on public.assemblies
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "assemblies can be deleted by their owner"
on public.assemblies
for delete
to authenticated
using (created_by = (select auth.uid()));

create policy "assembly nodes are visible to assembly owners"
on public.assembly_nodes
for select
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_nodes.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly nodes can be inserted by assembly owners"
on public.assembly_nodes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_nodes.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly nodes can be updated by assembly owners"
on public.assembly_nodes
for update
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_nodes.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_nodes.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly nodes can be deleted by assembly owners"
on public.assembly_nodes
for delete
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_nodes.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly connections are visible to assembly owners"
on public.assembly_connections
for select
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_connections.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly connections can be inserted by assembly owners"
on public.assembly_connections
for insert
to authenticated
with check (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_connections.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly connections can be updated by assembly owners"
on public.assembly_connections
for update
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_connections.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_connections.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create policy "assembly connections can be deleted by assembly owners"
on public.assembly_connections
for delete
to authenticated
using (
  exists (
    select 1
    from public.assemblies
    where assemblies.id = assembly_connections.assembly_id
      and assemblies.created_by = (select auth.uid())
  )
);

create or replace function public.save_assembly_graph(payload jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_assembly_id uuid;
  v_updated_id uuid;
  v_user_id uuid := auth.uid();
  v_node jsonb;
  v_connection jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_assembly_id := nullif(payload->>'id', '')::uuid;

  if v_assembly_id is null then
    insert into public.assemblies (
      name,
      gas,
      service,
      max_operating_pressure_psig,
      created_by
    )
    values (
      coalesce(nullif(payload->>'name', ''), 'Untitled Assembly'),
      coalesce(nullif(payload->>'gas', ''), 'Helium'),
      coalesce(nullif(payload->>'service', ''), 'Carrier Gas'),
      coalesce(nullif(payload->>'max_operating_pressure_psig', '')::numeric, 100),
      v_user_id
    )
    returning id into v_assembly_id;
  else
    update public.assemblies
    set
      name = coalesce(nullif(payload->>'name', ''), name),
      gas = coalesce(nullif(payload->>'gas', ''), gas),
      service = coalesce(nullif(payload->>'service', ''), service),
      max_operating_pressure_psig = coalesce(nullif(payload->>'max_operating_pressure_psig', '')::numeric, max_operating_pressure_psig),
      version = version + 1
    where id = v_assembly_id
      and created_by = v_user_id
    returning id into v_updated_id;

    if v_updated_id is null then
      raise exception 'Assembly not found or not owned';
    end if;
  end if;

  delete from public.assembly_connections
  where assembly_id = v_assembly_id;

  delete from public.assembly_nodes
  where assembly_id = v_assembly_id;

  for v_node in
    select value from jsonb_array_elements(coalesce(payload->'nodes', '[]'::jsonb))
  loop
    insert into public.assembly_nodes (
      assembly_id,
      part_id,
      node_key,
      label,
      x,
      y,
      length_ft,
      tag,
      notes
    )
    values (
      v_assembly_id,
      (v_node->>'part_id')::uuid,
      v_node->>'node_key',
      coalesce(nullif(v_node->>'label', ''), 'Untitled Part'),
      coalesce(nullif(v_node->>'x', '')::numeric, 0),
      coalesce(nullif(v_node->>'y', '')::numeric, 0),
      nullif(v_node->>'length_ft', '')::numeric,
      nullif(v_node->>'tag', ''),
      nullif(v_node->>'notes', '')
    );
  end loop;

  for v_connection in
    select value from jsonb_array_elements(coalesce(payload->'connections', '[]'::jsonb))
  loop
    insert into public.assembly_connections (
      assembly_id,
      edge_key,
      from_node,
      from_port,
      to_node,
      to_port
    )
    values (
      v_assembly_id,
      v_connection->>'edge_key',
      v_connection->>'from_node',
      v_connection->>'from_port',
      v_connection->>'to_node',
      v_connection->>'to_port'
    );
  end loop;

  return v_assembly_id;
end;
$$;

revoke all on function public.save_assembly_graph(jsonb) from public;
revoke all on function public.save_assembly_graph(jsonb) from anon;
grant execute on function public.save_assembly_graph(jsonb) to authenticated;
