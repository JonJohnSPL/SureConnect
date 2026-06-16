import type { AssemblyContext, AssemblyGraph } from "../engine";
import { getSupabase } from "./supabase";

export interface AssemblySummary {
  id: string;
  name: string;
  status: string;
  gas: string;
  service: string;
  pressure: number;
  updatedAt: string;
}

export interface StoredAssembly {
  id: string;
  name: string;
  status: string;
  context: AssemblyContext;
  graph: AssemblyGraph;
}

interface AssemblyRow {
  id: string;
  name: string;
  status: string;
  gas: string;
  service: string;
  max_operating_pressure_psig: number;
  updated_at: string;
}

interface NodeRow {
  node_key: string;
  part_id: string;
  label: string;
  x: number;
  y: number;
  length_ft: number | null;
  tag: string | null;
  notes: string | null;
}

interface ConnectionRow {
  edge_key: string;
  from_node: string;
  from_port: string;
  to_node: string;
  to_port: string;
}

export async function fetchAssemblySummaries(): Promise<AssemblySummary[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from("assemblies")
    .select("id, name, status, gas, service, max_operating_pressure_psig, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data || []) as AssemblyRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    gas: row.gas,
    service: row.service,
    pressure: row.max_operating_pressure_psig,
    updatedAt: row.updated_at,
  }));
}

export async function fetchAssembly(id: string): Promise<StoredAssembly> {
  const client = getSupabase();
  const [{ data: assembly, error: assemblyError }, { data: nodes, error: nodesError }, { data: connections, error: connectionsError }] =
    await Promise.all([
      client
        .from("assemblies")
        .select("id, name, status, gas, service, max_operating_pressure_psig, updated_at")
        .eq("id", id)
        .single(),
      client.from("assembly_nodes").select("node_key, part_id, label, x, y, length_ft, tag, notes").eq("assembly_id", id),
      client
        .from("assembly_connections")
        .select("edge_key, from_node, from_port, to_node, to_port")
        .eq("assembly_id", id),
    ]);

  if (assemblyError) throw assemblyError;
  if (nodesError) throw nodesError;
  if (connectionsError) throw connectionsError;

  const assemblyRow = assembly as AssemblyRow;
  return {
    id: assemblyRow.id,
    name: assemblyRow.name,
    status: assemblyRow.status,
    context: {
      gas: assemblyRow.gas,
      service: assemblyRow.service,
      pressure: assemblyRow.max_operating_pressure_psig,
    },
    graph: {
      nodes: ((nodes || []) as NodeRow[]).map((node) => ({
        id: node.node_key,
        partId: node.part_id,
        label: node.label,
        x: Number(node.x),
        y: Number(node.y),
        lengthFt: node.length_ft,
        tag: node.tag || "",
        notes: node.notes || "",
      })),
      connections: ((connections || []) as ConnectionRow[]).map((connection) => ({
        id: connection.edge_key,
        from: { nodeId: connection.from_node, portId: connection.from_port },
        to: { nodeId: connection.to_node, portId: connection.to_port },
      })),
    },
  };
}

export async function saveAssemblyGraph(input: {
  id?: string;
  name: string;
  context: AssemblyContext;
  graph: AssemblyGraph;
}): Promise<string> {
  const client = getSupabase();
  const payload = {
    id: input.id || null,
    name: input.name,
    gas: input.context.gas,
    service: input.context.service,
    max_operating_pressure_psig: input.context.pressure,
    nodes: input.graph.nodes.map((node) => ({
      node_key: node.id,
      part_id: node.partId,
      label: node.label,
      x: node.x,
      y: node.y,
      length_ft: node.lengthFt,
      tag: node.tag || null,
      notes: node.notes || null,
    })),
    connections: input.graph.connections.map((connection) => ({
      edge_key: connection.id,
      from_node: connection.from.nodeId,
      from_port: connection.from.portId,
      to_node: connection.to.nodeId,
      to_port: connection.to.portId,
    })),
  };
  const { data, error } = await client.rpc("save_assembly_graph", { payload });
  if (error) throw error;
  return data as string;
}

export async function deleteAssembly(id: string): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from("assemblies").delete().eq("id", id);
  if (error) throw error;
}

