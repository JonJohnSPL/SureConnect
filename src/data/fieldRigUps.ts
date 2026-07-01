import { defaultFieldContext } from "../field/options";
import { createInitialFieldGraph, ensureFieldEndpoints } from "../field/engine";
import type { FieldRigUpContext, FieldRigUpGraph, FieldRigUpSummary, StoredFieldRigUp } from "../field/types";
import { getSupabase } from "./supabase";

interface FieldRigUpRow {
  id: string;
  name: string;
  status: string;
  customer_config: FieldRigUpContext["customer"] | null;
  truck_config: FieldRigUpContext["truck"] | null;
  operating_pressure_psig: number | null;
  notes: string | null;
  graph: FieldRigUpGraph | null;
  updated_at: string;
}

function contextFromRow(row: FieldRigUpRow): FieldRigUpContext {
  return {
    customer: { ...defaultFieldContext.customer, ...(row.customer_config || {}) },
    truck: { ...defaultFieldContext.truck, ...(row.truck_config || {}) },
    pressure: Number(row.operating_pressure_psig ?? defaultFieldContext.pressure),
    notes: row.notes || "",
  };
}

function graphFromRow(row: FieldRigUpRow): FieldRigUpGraph {
  return ensureFieldEndpoints(row.graph || createInitialFieldGraph());
}

function summaryFromRow(row: FieldRigUpRow): FieldRigUpSummary {
  const context = contextFromRow(row);
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    customerLabel: `${context.customer.meterType} ${context.customer.size} ${context.customer.rating}`,
    truckLabel: `${context.truck.type} / ${context.truck.connection}`,
    updatedAt: row.updated_at,
  };
}

export async function fetchFieldRigUpSummaries(): Promise<FieldRigUpSummary[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from("field_rigups")
    .select("id, name, status, customer_config, truck_config, operating_pressure_psig, notes, graph, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data || []) as FieldRigUpRow[]).map(summaryFromRow);
}

export async function fetchFieldRigUp(id: string): Promise<StoredFieldRigUp> {
  const client = getSupabase();
  const { data, error } = await client
    .from("field_rigups")
    .select("id, name, status, customer_config, truck_config, operating_pressure_psig, notes, graph, updated_at")
    .eq("id", id)
    .single();

  if (error) throw error;
  const row = data as FieldRigUpRow;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    context: contextFromRow(row),
    graph: graphFromRow(row),
  };
}

export async function saveFieldRigUp(input: {
  id?: string;
  name: string;
  status: string;
  context: FieldRigUpContext;
  graph: FieldRigUpGraph;
}): Promise<string> {
  const client = getSupabase();
  const payload = {
    name: input.name || "Untitled Field Rig-Up",
    status: input.status,
    customer_config: input.context.customer,
    truck_config: input.context.truck,
    operating_pressure_psig: input.context.pressure,
    notes: input.context.notes || null,
    graph: ensureFieldEndpoints(input.graph),
  };

  if (input.id) {
    const { data, error } = await client.from("field_rigups").update(payload).eq("id", input.id).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await client.from("field_rigups").insert(payload).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteFieldRigUp(id: string): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from("field_rigups").delete().eq("id", id);
  if (error) throw error;
}
