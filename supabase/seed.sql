do $$
declare
  v_part jsonb;
  v_port jsonb;
  v_part_id uuid;
  v_parts jsonb := '[
    {
      "slug": "source-he-cyl",
      "category": "Gas Sources",
      "icon": "CYL",
      "name": "Helium Cylinder / Source",
      "manufacturer": "Generic",
      "part_number": "SOURCE-HE-CGA580",
      "material": "Steel cylinder",
      "max_pressure_psig": 2200,
      "gases": ["Helium"],
      "notes": "High-pressure gas source. Requires compatible regulator.",
      "ports": [
        { "port_key": "out", "label": "CGA-580", "type": "CGA", "size": "CGA-580", "gender": "female", "side": "right" }
      ]
    },
    {
      "slug": "source-cal-gas",
      "category": "Gas Sources",
      "icon": "STD",
      "name": "Calibration Gas Cylinder",
      "manufacturer": "Generic",
      "part_number": "SOURCE-CAL-CGA350",
      "material": "Steel cylinder",
      "max_pressure_psig": 2200,
      "gases": ["Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Calibration gas source. Confirm CGA connection before use.",
      "ports": [
        { "port_key": "out", "label": "CGA-350", "type": "CGA", "size": "CGA-350", "gender": "female", "side": "right" }
      ]
    },
    {
      "slug": "reg-2stage-cga580",
      "category": "Pressure Control",
      "icon": "REG",
      "name": "Two-Stage Regulator CGA-580",
      "manufacturer": "Approved Vendor",
      "part_number": "REG-CGA580-0250",
      "material": "Brass / SS wetted path",
      "max_pressure_psig": 3000,
      "gases": ["Helium", "Nitrogen", "Air"],
      "notes": "Use for inert carrier gases. Outlet shown as 1/4 in FNPT.",
      "ports": [
        { "port_key": "in", "label": "CGA-580", "type": "CGA", "size": "CGA-580", "gender": "male", "side": "left" },
        { "port_key": "out", "label": "1/4 FNPT", "type": "NPT", "size": "1/4 in", "gender": "female", "thread": "NPT", "side": "right" }
      ]
    },
    {
      "slug": "reg-2stage-cga350",
      "category": "Pressure Control",
      "icon": "REG",
      "name": "Two-Stage Regulator CGA-350",
      "manufacturer": "Approved Vendor",
      "part_number": "REG-CGA350-0250",
      "material": "Brass / SS wetted path",
      "max_pressure_psig": 3000,
      "gases": ["Calibration Gas", "Methane", "Propane", "Sample Gas"],
      "notes": "Common fuel/calibration gas style placeholder. Verify actual cylinder CGA.",
      "ports": [
        { "port_key": "in", "label": "CGA-350", "type": "CGA", "size": "CGA-350", "gender": "male", "side": "left" },
        { "port_key": "out", "label": "1/4 FNPT", "type": "NPT", "size": "1/4 in", "gender": "female", "thread": "NPT", "side": "right" }
      ]
    },
    {
      "slug": "adapter-nptm-to-tube14",
      "category": "Adapters",
      "icon": "ADP",
      "name": "1/4 MNPT x 1/4 Tube Adapter",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-400-1-4",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Thread sealant required on NPT side only. Tube side requires ferrules.",
      "ports": [
        { "port_key": "npt", "label": "1/4 MNPT", "type": "NPT", "size": "1/4 in", "gender": "male", "thread": "NPT", "side": "left", "sealant_rule": "required" },
        { "port_key": "tube", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "adapter-nptm-to-tube18",
      "category": "Adapters",
      "icon": "ADP",
      "name": "1/4 MNPT x 1/8 Tube Adapter",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-200-1-4",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Thread sealant required on NPT side only. Tube side requires ferrules.",
      "ports": [
        { "port_key": "npt", "label": "1/4 MNPT", "type": "NPT", "size": "1/4 in", "gender": "male", "thread": "NPT", "side": "left", "sealant_rule": "required" },
        { "port_key": "tube", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "tube-ss-14",
      "category": "Tubing",
      "icon": "TUB",
      "name": "1/4 in 316 SS Tubing",
      "manufacturer": "Approved Vendor",
      "part_number": "TUBE-SS-1/4",
      "material": "316 SS",
      "max_pressure_psig": 2000,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "default_length_ft": 3,
      "notes": "Cut square, deburr, inspect, and use correct ferrules.",
      "ports": [
        { "port_key": "a", "label": "1/4 Tube", "type": "tube_end", "size": "1/4 in", "gender": "tube", "side": "left" },
        { "port_key": "b", "label": "1/4 Tube", "type": "tube_end", "size": "1/4 in", "gender": "tube", "side": "right" }
      ]
    },
    {
      "slug": "tube-ss-18",
      "category": "Tubing",
      "icon": "TUB",
      "name": "1/8 in 316 SS Tubing",
      "manufacturer": "Approved Vendor",
      "part_number": "TUBE-SS-1/8",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "default_length_ft": 3,
      "notes": "Common GC gas line tubing. Cut square and deburr.",
      "ports": [
        { "port_key": "a", "label": "1/8 Tube", "type": "tube_end", "size": "1/8 in", "gender": "tube", "side": "left" },
        { "port_key": "b", "label": "1/8 Tube", "type": "tube_end", "size": "1/8 in", "gender": "tube", "side": "right" }
      ]
    },
    {
      "slug": "valve-shutoff-14",
      "category": "Valves",
      "icon": "VAL",
      "name": "1/4 in Tube Shutoff Valve",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-4P4T",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Install where isolation is required. Verify open/closed position during startup.",
      "ports": [
        { "port_key": "in", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "left", "ferrule_required": true },
        { "port_key": "out", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "valve-needle-18",
      "category": "Valves",
      "icon": "NDL",
      "name": "1/8 in Tube Needle Valve",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-2MG",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Directional control component. Verify flow direction if valve is marked.",
      "ports": [
        { "port_key": "in", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "left", "ferrule_required": true },
        { "port_key": "out", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "reducer-14-18",
      "category": "Adapters",
      "icon": "RED",
      "name": "1/4 Tube x 1/8 Tube Reducer Union",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-400-6-2",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Reduces tube OD. Both ends require correct ferrules.",
      "ports": [
        { "port_key": "large", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "left", "ferrule_required": true },
        { "port_key": "small", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "trap-moisture-18",
      "category": "Traps / Filters",
      "icon": "TRP",
      "name": "1/8 in Moisture Trap",
      "manufacturer": "Approved Vendor",
      "part_number": "TRAP-H2O-1/8",
      "material": "SS / sorbent",
      "max_pressure_psig": 250,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas"],
      "notes": "Check flow direction. Replace based on SOP or indicator status.",
      "ports": [
        { "port_key": "in", "label": "IN 1/8", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "left", "ferrule_required": true },
        { "port_key": "out", "label": "OUT 1/8", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "qc-plug-14",
      "category": "Quick Connects",
      "icon": "QCP",
      "name": "1/4 in Quick-Connect Plug",
      "manufacturer": "Approved Vendor",
      "part_number": "QC-PLUG-1/4",
      "material": "316 SS",
      "max_pressure_psig": 500,
      "gases": ["Air", "Nitrogen", "Helium"],
      "notes": "Use only with matching socket and approved gas service.",
      "ports": [
        { "port_key": "tube", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "left", "ferrule_required": true },
        { "port_key": "qc", "label": "QC Plug", "type": "quick_connect", "size": "1/4 in", "gender": "plug", "side": "right" }
      ]
    },
    {
      "slug": "qc-socket-14",
      "category": "Quick Connects",
      "icon": "QCS",
      "name": "1/4 in Quick-Connect Socket",
      "manufacturer": "Approved Vendor",
      "part_number": "QC-SOCKET-1/4",
      "material": "316 SS",
      "max_pressure_psig": 500,
      "gases": ["Air", "Nitrogen", "Helium"],
      "notes": "Use only with matching plug and approved gas service.",
      "ports": [
        { "port_key": "qc", "label": "QC Socket", "type": "quick_connect", "size": "1/4 in", "gender": "socket", "side": "left" },
        { "port_key": "tube", "label": "1/4 Tube", "type": "tube_receiver", "size": "1/4 in", "gender": "receiver", "side": "right", "ferrule_required": true }
      ]
    },
    {
      "slug": "gc-carrier-inlet-18",
      "category": "GC Instrument Ports",
      "icon": "GC",
      "name": "GC Carrier Gas Inlet 1/8 Tube",
      "manufacturer": "Instrument",
      "part_number": "GC-INLET-CARRIER-1/8",
      "material": "Instrument port",
      "max_pressure_psig": 250,
      "gases": ["Helium", "Nitrogen", "Hydrogen"],
      "notes": "Instrument-side carrier gas inlet. Verify method and instrument label.",
      "ports": [
        { "port_key": "in", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "left", "ferrule_required": true }
      ]
    },
    {
      "slug": "gc-fid-air-inlet-18",
      "category": "GC Instrument Ports",
      "icon": "GC",
      "name": "GC FID Air Inlet 1/8 Tube",
      "manufacturer": "Instrument",
      "part_number": "GC-INLET-FID-AIR-1/8",
      "material": "Instrument port",
      "max_pressure_psig": 150,
      "gases": ["Air"],
      "notes": "FID air inlet. Do not connect fuel gas here.",
      "ports": [
        { "port_key": "in", "label": "1/8 Tube", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "left", "ferrule_required": true }
      ]
    },
    {
      "slug": "cap-tube-18",
      "category": "Caps / Plugs",
      "icon": "CAP",
      "name": "1/8 in Tube Cap",
      "manufacturer": "Swagelok-style",
      "part_number": "SS-200-C",
      "material": "316 SS",
      "max_pressure_psig": 2500,
      "gases": ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"],
      "notes": "Cap unused 1/8 in tube fitting ports. Do not dead-end pressure source without relief/vent logic.",
      "ports": [
        { "port_key": "cap", "label": "1/8 Cap", "type": "tube_receiver", "size": "1/8 in", "gender": "receiver", "side": "left", "ferrule_required": true }
      ]
    }
  ]'::jsonb;
begin
  for v_part in
    select value from jsonb_array_elements(v_parts)
  loop
    insert into public.parts (
      slug,
      category,
      icon,
      name,
      manufacturer,
      part_number,
      material,
      max_pressure_psig,
      gases,
      default_length_ft,
      notes,
      approved
    )
    values (
      v_part->>'slug',
      v_part->>'category',
      v_part->>'icon',
      v_part->>'name',
      v_part->>'manufacturer',
      v_part->>'part_number',
      v_part->>'material',
      (v_part->>'max_pressure_psig')::numeric,
      array(select jsonb_array_elements_text(v_part->'gases')),
      nullif(v_part->>'default_length_ft', '')::numeric,
      v_part->>'notes',
      true
    )
    on conflict (slug) do update
    set
      category = excluded.category,
      icon = excluded.icon,
      name = excluded.name,
      manufacturer = excluded.manufacturer,
      part_number = excluded.part_number,
      material = excluded.material,
      max_pressure_psig = excluded.max_pressure_psig,
      gases = excluded.gases,
      default_length_ft = excluded.default_length_ft,
      notes = excluded.notes,
      approved = excluded.approved
    returning id into v_part_id;

    delete from public.part_ports where part_id = v_part_id;

    for v_port in
      select value from jsonb_array_elements(v_part->'ports')
    loop
      insert into public.part_ports (
        part_id,
        port_key,
        label,
        type,
        size,
        gender,
        thread,
        sealant_rule,
        ferrule_required,
        side
      )
      values (
        v_part_id,
        v_port->>'port_key',
        v_port->>'label',
        v_port->>'type',
        nullif(v_port->>'size', ''),
        v_port->>'gender',
        nullif(v_port->>'thread', ''),
        nullif(v_port->>'sealant_rule', ''),
        coalesce((v_port->>'ferrule_required')::boolean, false),
        v_port->>'side'
      );
    end loop;
  end loop;
end $$;

