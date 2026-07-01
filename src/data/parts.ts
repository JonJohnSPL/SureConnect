import { getSupabase } from "./supabase";
import type { Part, Port, PortSide } from "../engine";

interface PartPortRow {
  port_key: string;
  label: string;
  type: string;
  size: string | null;
  gender: string;
  thread: string | null;
  ferrule_required: boolean | null;
  sealant_rule: string | null;
  side: PortSide;
}

interface PartRow {
  id: string;
  slug: string;
  name: string;
  manufacturer: string | null;
  part_number: string | null;
  category: string;
  material: string | null;
  max_pressure_psig: number | null;
  gases: string[] | null;
  default_length_ft: number | null;
  icon: string | null;
  notes: string | null;
  scope: "lab" | "field" | "shared" | null;
  approved: boolean;
  part_ports: PartPortRow[] | null;
}

const sideRank: Record<PortSide, number> = {
  left: 0,
  top: 1,
  right: 2,
  bottom: 3,
};

function mapPort(row: PartPortRow): Port {
  return {
    id: row.port_key,
    label: row.label,
    type: row.type,
    size: row.size,
    gender: row.gender,
    thread: row.thread,
    ferrule: row.ferrule_required,
    sealant: row.sealant_rule,
    side: row.side,
  };
}

function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    icon: row.icon || "PRT",
    name: row.name,
    manufacturer: row.manufacturer || "",
    partNumber: row.part_number || "",
    material: row.material || "",
    maxPressure: row.max_pressure_psig || 0,
    gases: row.gases || [],
    defaultLengthFt: row.default_length_ft,
    notes: row.notes,
    approved: row.approved,
    ports: (row.part_ports || [])
      .map(mapPort)
      .sort((a, b) => sideRank[a.side] - sideRank[b.side] || a.id.localeCompare(b.id)),
  };
}

export async function fetchApprovedParts(scope: "lab" | "field" | "shared" = "lab"): Promise<Part[]> {
  const client = getSupabase();
  let query = client
    .from("parts")
    .select(
      "id, slug, name, manufacturer, part_number, category, material, max_pressure_psig, gases, default_length_ft, icon, notes, scope, approved, part_ports(port_key, label, type, size, gender, thread, ferrule_required, sealant_rule, side)",
    )
    .eq("approved", true);

  if (scope !== "shared") query = query.in("scope", [scope, "shared"]);
  else query = query.eq("scope", "shared");

  const { data, error } = await query
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data || []) as PartRow[]).map(mapPart);
}
