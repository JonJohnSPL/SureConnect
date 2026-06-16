import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  useReactFlow,
} from "@xyflow/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, TestTube2, Wand2 } from "lucide-react";
import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchAssembly, saveAssemblyGraph } from "../data/assemblies";
import { fetchApprovedParts } from "../data/parts";
import { createSampleAssembly, sampleContext } from "../data/sampleAssembly";
import { isSupabaseConfigured } from "../data/supabase";
import {
  getBOM,
  getConnectionSteps,
  validateAssembly,
  validateConnection,
  type AssemblyContext,
  type AssemblyGraph,
  type AssemblyNode,
  type Part,
  type ValidationStatus,
} from "../engine";
import { BuildSheetPanels } from "../features/buildsheet/BuildSheetPanels";
import { PartNode, type PartNodeData } from "../features/canvas/PartNode";
import { Inspector, type BuilderSelection } from "../features/inspector/Inspector";
import { Toolbox } from "../features/toolbox/Toolbox";

const gasOptions = ["Helium", "Nitrogen", "Hydrogen", "Air", "Calibration Gas", "Sample Gas", "Methane", "Propane"];
const serviceOptions = ["Carrier Gas", "FID Fuel Gas", "FID Air", "Calibration Standard", "Sample Transfer", "Pneumatic Control", "Vent"];
const nodeTypes = { part: PartNode };

const emptyGraph: AssemblyGraph = {
  nodes: [],
  connections: [],
};

function nextKey(prefix: string, keys: string[]) {
  const max = keys.reduce((current, key) => {
    const match = key.match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}${max + 1}`;
}

function edgeColor(status: ValidationStatus) {
  if (status === "invalid") return "#ef4444";
  if (status === "warn") return "#f59e0b";
  return "#22c55e";
}

export function BuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderWorkspace />
    </ReactFlowProvider>
  );
}

function BuilderWorkspace() {
  const { assemblyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();
  const [name, setName] = useState("Untitled Assembly");
  const [context, setContext] = useState<AssemblyContext>(sampleContext);
  const [graph, setGraph] = useState<AssemblyGraph>(emptyGraph);
  const [selection, setSelection] = useState<BuilderSelection>(null);
  const [dirty, setDirty] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const partsQuery = useQuery({
    queryKey: ["parts"],
    queryFn: fetchApprovedParts,
    enabled: isSupabaseConfigured,
  });
  const assemblyQuery = useQuery({
    queryKey: ["assembly", assemblyId],
    queryFn: () => fetchAssembly(assemblyId as string),
    enabled: Boolean(isSupabaseConfigured && assemblyId),
  });

  useEffect(() => {
    if (!assemblyId) {
      setName("Untitled Assembly");
      setContext(sampleContext);
      setGraph(emptyGraph);
      setSelection(null);
      setDirty(false);
      return;
    }
    if (assemblyQuery.data) {
      setName(assemblyQuery.data.name);
      setContext(assemblyQuery.data.context);
      setGraph(assemblyQuery.data.graph);
      setSelection(null);
      setDirty(false);
    }
  }, [assemblyId, assemblyQuery.data]);

  const parts = partsQuery.data || [];
  const partMap = useMemo(() => new Map(parts.map((part) => [part.id, part])), [parts]);
  const issues = useMemo(() => validateAssembly(graph, parts, context), [context, graph, parts]);
  const bom = useMemo(() => getBOM(graph, parts), [graph, parts]);
  const steps = useMemo(() => getConnectionSteps(graph, parts, context), [context, graph, parts]);
  const invalid = issues.some((issue) => issue.status === "invalid");
  const warn = issues.some((issue) => issue.status === "warn");
  const systemStatus = invalid ? "Blocked" : warn ? "Review Required" : graph.nodes.length ? "Valid Draft" : "Draft";
  const systemStatusClass = invalid ? "invalid" : warn ? "warn" : graph.nodes.length ? "valid" : "draft";

  const commitGraph = useCallback((updater: (current: AssemblyGraph) => AssemblyGraph) => {
    setGraph((current) => updater(current));
    setDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => saveAssemblyGraph({ id: assemblyId, name, context, graph }),
    onSuccess: (id) => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["assemblies"] });
      queryClient.invalidateQueries({ queryKey: ["assembly", id] });
      if (!assemblyId) navigate(`/builder/${id}`, { replace: true });
    },
  });

  const flowNodes = useMemo<Node<PartNodeData>[]>(
    () =>
      graph.nodes.map((node) => {
        const part = partMap.get(node.partId);
        const connectedEdges = graph.connections.filter((edge) => edge.from.nodeId === node.id || edge.to.nodeId === node.id);
        const edgeStatuses = connectedEdges
          .map((edge) => validateConnection(graph, parts, context, edge.from, edge.to).status)
          .filter((status) => status !== "valid");
        const status = (edgeStatuses.includes("invalid") ? "invalid" : edgeStatuses.includes("warn") ? "warn" : "draft") as PartNodeData["status"];

        return {
          id: node.id,
          type: "part",
          position: { x: node.x, y: node.y },
          data: {
            part: part || {
              id: node.partId,
              slug: "missing",
              category: "Missing",
              icon: "???",
              name: "Missing Part",
              manufacturer: "",
              partNumber: "",
              material: "",
              maxPressure: 0,
              gases: [],
              ports: [],
            },
            assemblyNode: node,
            status,
          },
        };
      }),
    [context, graph, partMap, parts],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graph.connections.map((connection) => {
        const validation = validateConnection(graph, parts, context, connection.from, connection.to);
        return {
          id: connection.id,
          source: connection.from.nodeId,
          target: connection.to.nodeId,
          sourceHandle: connection.from.portId,
          targetHandle: connection.to.portId,
          className: `flow-edge-${validation.status}`,
          style: { stroke: edgeColor(validation.status), strokeWidth: selection?.type === "edge" && selection.id === connection.id ? 4 : 3 },
          label: validation.status === "valid" ? "" : validation.status.toUpperCase(),
        };
      }),
    [context, graph, parts, selection],
  );

  function updateContext(patch: Partial<AssemblyContext>) {
    setContext((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function updateNode(id: string, patch: Partial<AssemblyNode>) {
    commitGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }));
  }

  function deleteSelection() {
    if (!selection) return;
    commitGraph((current) => {
      if (selection.type === "node") {
        return {
          nodes: current.nodes.filter((node) => node.id !== selection.id),
          connections: current.connections.filter((edge) => edge.from.nodeId !== selection.id && edge.to.nodeId !== selection.id),
        };
      }
      return {
        ...current,
        connections: current.connections.filter((edge) => edge.id !== selection.id),
      };
    });
    setSelection(null);
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positions = new Map<string, { x: number; y: number }>();
      changes.forEach((change) => {
        if (change.type === "position" && change.position) positions.set(change.id, change.position);
      });
      if (!positions.size) return;
      commitGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          const position = positions.get(node.id);
          return position ? { ...node, x: position.x, y: position.y } : node;
        }),
      }));
    },
    [commitGraph],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes.filter((change) => change.type === "remove").map((change) => change.id);
      if (!removed.length) return;
      commitGraph((current) => ({
        ...current,
        connections: current.connections.filter((edge) => !removed.includes(edge.id)),
      }));
    },
    [commitGraph],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
      const source = connection.source;
      const target = connection.target;
      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;
      commitGraph((current) => {
        const duplicate = current.connections.some(
          (edge) =>
            (edge.from.nodeId === source &&
              edge.from.portId === sourceHandle &&
              edge.to.nodeId === target &&
              edge.to.portId === targetHandle) ||
            (edge.from.nodeId === target &&
              edge.from.portId === targetHandle &&
              edge.to.nodeId === source &&
              edge.to.portId === sourceHandle),
        );
        if (duplicate) return current;
        return {
          ...current,
          connections: [
            ...current.connections,
            {
              id: nextKey("E", current.connections.map((edge) => edge.id)),
              from: { nodeId: source, portId: sourceHandle },
              to: { nodeId: target, portId: targetHandle },
            },
          ],
        };
      });
    },
    [commitGraph],
  );

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const partId = event.dataTransfer.getData("application/connection-master-part-id");
    const part = partMap.get(partId);
    if (!part) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    commitGraph((current) => ({
      ...current,
      nodes: [
        ...current.nodes,
        {
          id: nextKey("N", current.nodes.map((node) => node.id)),
          partId: part.id,
          label: part.name,
          x: Math.round(position.x / 12) * 12,
          y: Math.round(position.y / 12) * 12,
          lengthFt: part.category === "Tubing" ? part.defaultLengthFt || 3 : null,
          tag: "",
          notes: "",
        },
      ],
    }));
  }

  function loadSample() {
    try {
      setGraph(createSampleAssembly(parts));
      setContext(sampleContext);
      setName("Sample Carrier Gas Build");
      setSelection(null);
      setDirty(true);
      setLocalError(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Unable to load sample build.");
    }
  }

  return (
    <main className="builder-page">
      <Toolbox parts={parts} />
      <section className="builder-main">
        <div className="builder-toolbar">
          <input className="assembly-name" value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} />
          <label>
            Gas
            <select value={context.gas} onChange={(event) => updateContext({ gas: event.target.value })}>
              {gasOptions.map((gas) => (
                <option key={gas} value={gas}>
                  {gas}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service
            <select value={context.service} onChange={(event) => updateContext({ service: event.target.value })}>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>
          <label>
            psig
            <input min={0} type="number" value={context.pressure} onChange={(event) => updateContext({ pressure: Number(event.target.value || 0) })} />
          </label>
          <span className={`status-pill status-${systemStatusClass}`}>{systemStatus}</span>
          {dirty ? <span className="dirty-dot">Unsaved</span> : null}
          <button className="ghost" type="button" onClick={loadSample} disabled={!parts.length}>
            <Wand2 size={16} />
            Sample
          </button>
          <button className="primary" type="button" onClick={() => saveMutation.mutate()} disabled={!isSupabaseConfigured || saveMutation.isPending}>
            <Save size={16} />
            Save
          </button>
        </div>

        {!isSupabaseConfigured ? <div className="notice error">Set Supabase env values before using the builder.</div> : null}
        {partsQuery.error ? <div className="notice error">{partsQuery.error.message}</div> : null}
        {assemblyQuery.error ? <div className="notice error">{assemblyQuery.error.message}</div> : null}
        {saveMutation.error ? <div className="notice error">{saveMutation.error.message}</div> : null}
        {localError ? <div className="notice error">{localError}</div> : null}

        <div className="canvas-shell" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
          {!partsQuery.isLoading && parts.length === 0 ? (
            <div className="canvas-empty">
              <TestTube2 size={36} />
              <span>No approved parts loaded.</span>
            </div>
          ) : null}
          <ReactFlow
            edges={flowEdges}
            fitView
            nodes={flowNodes}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onEdgeClick={(_event, edge) => setSelection({ type: "edge", id: edge.id })}
            onNodeClick={(_event, node) => setSelection({ type: "node", id: node.id })}
            onNodesChange={onNodesChange}
            onPaneClick={() => setSelection(null)}
            snapGrid={[12, 12]}
            snapToGrid
          >
            <Background gap={24} color="#d1d5db" />
            <Controls />
          </ReactFlow>
        </div>
      </section>
      <aside className="right-panel">
        <Inspector context={context} graph={graph} parts={parts} selection={selection} onDelete={deleteSelection} onUpdateNode={updateNode} />
        <BuildSheetPanels issues={issues} bom={bom} steps={steps} />
      </aside>
    </main>
  );
}
