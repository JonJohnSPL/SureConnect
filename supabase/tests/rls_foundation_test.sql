BEGIN;
SELECT plan(1);

-- Examples: https://pgtap.org/documentation.html

SELECT * FROM finish();
ROLLBACK;
begin;

select plan(8);

select has_table('public', 'parts', 'parts table exists');
select has_table('public', 'assemblies', 'assemblies table exists');
select has_function('public', 'save_assembly_graph', ARRAY['jsonb'], 'save_assembly_graph RPC exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'b@example.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.parts (
  slug,
  name,
  manufacturer,
  part_number,
  category,
  material,
  max_pressure_psig,
  gases,
  icon,
  approved
)
values (
  'test-approved-part',
  'Approved Test Part',
  'Test',
  'TEST-1',
  'Adapters',
  '316 SS',
  1000,
  array['Helium'],
  'TST',
  true
)
on conflict (slug) do update set approved = true;

set local role anon;
select throws_ok(
  $$ select count(*) from public.parts $$,
  '42501',
  'anon cannot read parts'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int > 0 from public.parts),
  true,
  'authenticated users can read approved parts'
);
reset role;

create temporary table test_saved_assemblies (id uuid not null);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into test_saved_assemblies
select public.save_assembly_graph(
  jsonb_build_object(
    'name', 'Owner Assembly',
    'gas', 'Helium',
    'service', 'Carrier Gas',
    'max_operating_pressure_psig', 100,
    'nodes', '[]'::jsonb,
    'connections', '[]'::jsonb
  )
);

select is(
  (select count(*)::int from public.assemblies where id = (select id from test_saved_assemblies)),
  1,
  'owner can save and read their assembly'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select is(
  (select count(*)::int from public.assemblies where id = (select id from test_saved_assemblies)),
  0,
  'another user cannot read the owner assembly'
);

select throws_like(
  $sql$
    select public.save_assembly_graph(
      jsonb_build_object(
        'id', (select id from test_saved_assemblies)::text,
        'name', 'Hijacked Assembly',
        'gas', 'Helium',
        'service', 'Carrier Gas',
        'max_operating_pressure_psig', 100,
        'nodes', '[]'::jsonb,
        'connections', '[]'::jsonb
      )
    )
  $sql$,
  '%not owned%',
  'save RPC rejects non-owned assemblies'
);
reset role;

select is(
  (select count(*)::int from public.assemblies where created_by = '00000000-0000-0000-0000-0000000000a1'),
  1,
  'no duplicate assembly is created during rejected save'
);

select * from finish();

rollback;
