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
import { FileText, Save, Search, TestTube2, Trash2 } from "lucide-react";
import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchApprovedParts } from "../data/parts";
import { fetchFieldRigUp, saveFieldRigUp } from "../data/fieldRigUps";
import { isSupabaseConfigured } from "../data/supabase";
import type { Part, ValidationStatus } from "../engine";
import {
  createInitialFieldGraph,
  ensureFieldEndpoints,
  getFieldBOM,
  getFieldConnectionSteps,
  getFieldNodePart,
  getFieldStatus,
  getVirtualFieldEndpointPart,
  validateFieldConnection,
  validateFieldRigUp,
} from "../field/engine";
import {
  defaultFieldContext,
  fieldEndpointTypes,
  fieldFlangeRatings,
  fieldFlangeSizes,
  fieldMeterTypes,
  fieldTruckConnections,
  fieldTruckTypes,
} from "../field/options";
import type { FieldRigUpContext, FieldRigUpGraph, FieldRigUpNode } from "../field/types";
import { PartVisual } from "../features/canvas/PartVisual";
import { FieldPanels } from "../features/field/FieldPanels";
import { FieldPartNode, type FieldPartNodeData } from "../features/field/FieldPartNode";
import { FieldShopTicketModal } from "../features/field/FieldShopTicketModal";

type FieldSelection = { type: "node" | "edge"; id: string } | null;

const nodeTypes = { fieldPart: FieldPartNode };
const emptyGraph = createInitialFieldGraph();

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

export function FieldBuilderPage() {
  return (
    <ReactFlowProvider>
      <FieldBuilderWorkspace />
    </ReactFlowProvider>
  );
}

function FieldBuilderWorkspace() {
  const { rigUpId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();
  const [name, setName] = useState("Untitled Field Rig-Up");
  const [context, setContext] = useState<FieldRigUpContext>(defaultFieldContext);
  const [graph, setGraph] = useState<FieldRigUpGraph>(emptyGraph);
  const [selection, setSelection] = useState<FieldSelection>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [partSearch, setPartSearch] = useState("");

  const partsQuery = useQuery({
    queryKey: ["parts", "field"],
    queryFn: () => fetchApprovedParts("field"),
    enabled: isSupabaseConfigured,
  });
  const rigUpQuery = useQuery({
    queryKey: ["field-rigup", rigUpId],
    queryFn: () => fetchFieldRigUp(rigUpId as string),
    enabled: Boolean(isSupabaseConfigured && rigUpId),
  });

  useEffect(() => {
    if (!rigUpId) {
      setName("Untitled Field Rig-Up");
      setContext(defaultFieldContext);
      setGraph(createInitialFieldGraph());
      setSelection(null);
      setDirty(false);
      return;
    }
    if (rigUpQuery.data) {
      setName(rigUpQuery.data.name);
      setContext(rigUpQuery.data.context);
      setGraph(ensureFieldEndpoints(rigUpQuery.data.graph));
      setSelection(null);
      setDirty(false);
    }
  }, [rigUpId, rigUpQuery.data]);

  const parts = partsQuery.data || [];
  const partMap = useMemo(() => new Map(parts.map((part) => [part.id, part])), [parts]);
  const issues = useMemo(() => validateFieldRigUp(graph, parts, context), [context, graph, parts]);
  const bom = useMemo(() => getFieldBOM(graph, parts), [graph, parts]);
  const steps = useMemo(() => getFieldConnectionSteps(graph, parts, context), [context, graph, parts]);
  const rigStatus = useMemo(() => getFieldStatus(issues, graph), [graph, issues]);

  const groupedParts = useMemo(() => {
    const needle = partSearch.trim().toLowerCase();
    const filtered = parts.filter((part) => {
      if (!needle) return true;
      return [part.name, part.partNumber, part.category, part.manufacturer, part.notes || ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    return filtered.reduce<Record<string, Part[]>>((acc, part) => {
      acc[part.category] ||= [];
      acc[part.category].push(part);
      return acc;
    }, {});
  }, [partSearch, parts]);

  const commitGraph = useCallback((updater: (current: FieldRigUpGraph) => FieldRigUpGraph) => {
    setGraph((current) => ensureFieldEndpoints(updater(current)));
    setDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFieldRigUp({
        id: rigUpId,
        name,
        status: rigStatus.status,
        context,
        graph,
      }),
    onSuccess: (id) => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["field-rigups"] });
      queryClient.invalidateQueries({ queryKey: ["field-rigup", id] });
      if (!rigUpId) navigate(`/field/builder/${id}`, { replace: true });
    },
  });

  const flowNodes = useMemo<Node<FieldPartNodeData>[]>(
    () =>
      ensureFieldEndpoints(graph).nodes.map((node) => {
        const displayNode = withEndpointLabel(node, context);
        const part =
          displayNode.kind === "endpoint" && displayNode.endpoint
            ? getVirtualFieldEndpointPart(displayNode.endpoint, context)
            : partMap.get(displayNode.partId || "");
        const connectedEdges = graph.connections.filter((edge) => edge.from.nodeId === displayNode.id || edge.to.nodeId === displayNode.id);
        const edgeStatuses = connectedEdges
          .map((edge) => validateFieldConnection(graph, parts, context, edge.from, edge.to).status)
          .filter((status) => status !== "valid");
        const status = (edgeStatuses.includes("invalid") ? "invalid" : edgeStatuses.includes("warn") ? "warn" : "draft") as FieldPartNodeData["status"];

        return {
          id: displayNode.id,
          type: "fieldPart",
          position: { x: displayNode.x, y: displayNode.y },
          data: {
            part: part || missingFieldPart(displayNode.partId || ""),
            rigNode: displayNode,
            status,
          },
        };
      }),
    [context, graph, partMap, parts],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graph.connections.map((connection) => {
        const validation = validateFieldConnection(graph, parts, context, connection.from, connection.to);
        return {
          id: connection.id,
          source: connection.from.nodeId,
          target: connection.to.nodeId,
          sourceHandle: connection.from.portId,
          targetHandle: connection.to.portId,
          style: { stroke: edgeColor(validation.status), strokeWidth: selection?.type === "edge" && selection.id === connection.id ? 4 : 3 },
          label: validation.status === "valid" ? "" : validation.status.toUpperCase(),
        };
      }),
    [context, graph, parts, selection],
  );

  function updateContext(patch: Partial<FieldRigUpContext>) {
    setContext((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function updateCustomer(patch: Partial<FieldRigUpContext["customer"]>) {
    setContext((current) => ({ ...current, customer: { ...current.customer, ...patch } }));
    setDirty(true);
  }

  function updateTruck(patch: Partial<FieldRigUpContext["truck"]>) {
    setContext((current) => ({ ...current, truck: { ...current.truck, ...patch } }));
    setDirty(true);
  }

  function updateNode(id: string, patch: Partial<FieldRigUpNode>) {
    commitGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }));
  }

  function deleteSelection() {
    if (!selection) return;
    commitGraph((current) => {
      if (selection.type === "node") {
        const node = current.nodes.find((item) => item.id === selection.id);
        if (!node || node.kind === "endpoint") return current;
        return {
          nodes: current.nodes.filter((item) => item.id !== selection.id),
          connections: current.connections.filter((edge) => edge.from.nodeId !== selection.id && edge.to.nodeId !== selection.id),
        };
      }
      return { ...current, connections: current.connections.filter((edge) => edge.id !== selection.id) };
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
      commitGraph((current) => {
        const duplicate = current.connections.some(
          (edge) =>
            (edge.from.nodeId === connection.source &&
              edge.from.portId === connection.sourceHandle &&
              edge.to.nodeId === connection.target &&
              edge.to.portId === connection.targetHandle) ||
            (edge.from.nodeId === connection.target &&
              edge.from.portId === connection.targetHandle &&
              edge.to.nodeId === connection.source &&
              edge.to.portId === connection.sourceHandle),
        );
        if (duplicate) return current;
        return {
          ...current,
          connections: [
            ...current.connections,
            {
              id: nextKey("FE", current.connections.map((edge) => edge.id)),
              from: { nodeId: connection.source as string, portId: connection.sourceHandle as string },
              to: { nodeId: connection.target as string, portId: connection.targetHandle as string },
            },
          ],
        };
      });
    },
    [commitGraph],
  );

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const partId = event.dataTransfer.getData("application/connection-master-field-part-id");
    const part = partMap.get(partId);
    if (!part) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    commitGraph((current) => ({
      ...current,
      nodes: [
        ...current.nodes,
        {
          id: nextKey("FN", current.nodes.map((node) => node.id)),
          kind: "part",
          partId: part.id,
          label: part.name,
          x: Math.round(position.x / 12) * 12,
          y: Math.round(position.y / 12) * 12,
          lengthFt: part.category.toLowerCase().includes("hose") ? part.defaultLengthFt || 10 : null,
          tag: "",
          notes: "",
        },
      ],
    }));
  }

  return (
    <main className="builder-page field-builder-page">
      <aside className="toolbox-panel field-toolbox">
        <div className="panel-header">
          <h2>Customer Endpoint</h2>
          <label>
            Endpoint
            <select value={context.customer.endpointType} onChange={(event) => updateCustomer({ endpointType: event.target.value as FieldRigUpContext["customer"]["endpointType"] })}>
              {fieldEndpointTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Meter Technology
            <select value={context.customer.meterType} onChange={(event) => updateCustomer({ meterType: event.target.value })}>
              {fieldMeterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <select value={context.customer.size} onChange={(event) => updateCustomer({ size: event.target.value })}>
              {fieldFlangeSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label>
            Flange Rating
            <select value={context.customer.rating} onChange={(event) => updateCustomer({ rating: event.target.value })}>
              {fieldFlangeRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <Search size={16} />
            <input value={partSearch} placeholder="Search field parts" onChange={(event) => setPartSearch(event.target.value)} />
          </label>
        </div>
        <div className="toolbox-list field-parts-list">
          {Object.entries(groupedParts).map(([category, items]) => (
            <section key={category}>
              <h3>{category.replace(/^Field\s+/, "")}</h3>
              {items.map((part) => (
                <article
                  className="part-card"
                  draggable
                  key={part.id}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/connection-master-field-part-id", part.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <div className="part-card-icon">
                    <PartVisual part={part} variant="toolbox" />
                  </div>
                  <div>
                    <strong>{part.name}</strong>
                    <span>{part.partNumber}</span>
                    <p>{part.ports.map((port) => port.label).join(" / ")}</p>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </aside>

      <section className="builder-main">
        <div className="builder-toolbar">
          <input className="assembly-name" value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} />
          <label>
            psig
            <input min={0} type="number" value={context.pressure} onChange={(event) => updateContext({ pressure: Number(event.target.value || 0) })} />
          </label>
          <span className={`status-pill status-${rigStatus.className}`}>{rigStatus.label}</span>
          {dirty ? <span className="dirty-dot">Unsaved</span> : null}
          <button className="ghost" type="button" onClick={() => setTicketOpen(true)}>
            <FileText size={16} />
            Shop Ticket
          </button>
          <button className="primary" type="button" onClick={() => saveMutation.mutate()} disabled={!isSupabaseConfigured || saveMutation.isPending}>
            <Save size={16} />
            Save
          </button>
        </div>

        {!isSupabaseConfigured ? <div className="notice error">Set Supabase env values before using the field builder.</div> : null}
        {partsQuery.error ? <div className="notice error">{partsQuery.error.message}</div> : null}
        {rigUpQuery.error ? <div className="notice error">{rigUpQuery.error.message}</div> : null}
        {saveMutation.error ? <div className="notice error">{saveMutation.error.message}</div> : null}
        {localError ? <div className="notice error">{localError}</div> : null}

        <div className="canvas-shell" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
          {!partsQuery.isLoading && parts.length === 0 ? (
            <div className="canvas-empty">
              <TestTube2 size={36} />
              <span>No approved field parts loaded.</span>
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
        <section className="inspector-section">
          <h2>Prover Truck</h2>
          <label>
            Unit Type
            <select value={context.truck.type} onChange={(event) => updateTruck({ type: event.target.value })}>
              {fieldTruckTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Truck Connection
            <select value={context.truck.connection} onChange={(event) => updateTruck({ connection: event.target.value })}>
              {fieldTruckConnections.map((connection) => (
                <option key={connection} value={connection}>
                  {connection}
                </option>
              ))}
            </select>
          </label>
          <label>
            Field Notes
            <textarea value={context.notes} onChange={(event) => updateContext({ notes: event.target.value })} />
          </label>
        </section>
        <FieldInspector
          context={context}
          graph={graph}
          parts={parts}
          selection={selection}
          onDelete={deleteSelection}
          onUpdateNode={updateNode}
        />
        <FieldPanels issues={issues} bom={bom} steps={steps} />
      </aside>

      <FieldShopTicketModal
        bom={bom}
        context={context}
        graph={graph}
        issues={issues}
        onClose={() => setTicketOpen(false)}
        open={ticketOpen}
        rigUpName={name}
        steps={steps}
      />
    </main>
  );
}

function withEndpointLabel(node: FieldRigUpNode, context: FieldRigUpContext): FieldRigUpNode {
  if (node.kind !== "endpoint") return node;
  if (node.endpoint === "customer") {
    return { ...node, label: `${context.customer.meterType} ${context.customer.endpointType}` };
  }
  return { ...node, label: context.truck.type };
}

function missingFieldPart(partId: string): Part {
  return {
    id: partId || "missing",
    slug: "missing",
    category: "Missing",
    icon: "???",
    name: "Missing Field Part",
    manufacturer: "",
    partNumber: "",
    material: "",
    maxPressure: 0,
    gases: [],
    ports: [],
  };
}

function FieldInspector({
  context,
  graph,
  parts,
  selection,
  onDelete,
  onUpdateNode,
}: {
  context: FieldRigUpContext;
  graph: FieldRigUpGraph;
  parts: Part[];
  selection: FieldSelection;
  onDelete(): void;
  onUpdateNode(id: string, patch: Partial<FieldRigUpNode>): void;
}) {
  if (!selection) {
    return (
      <section className="inspector-section">
        <h2>Inspector</h2>
        <div className="empty-state compact">Select a field part or connection.</div>
      </section>
    );
  }

  if (selection.type === "node") {
    const node = graph.nodes.find((item) => item.id === selection.id);
    const part = getFieldNodePart(node, parts, context);
    if (!node || !part) return null;
    const isEndpoint = node.kind === "endpoint";

    return (
      <section className="inspector-section">
        <div className="panel-title-row">
          <h2>{isEndpoint ? "Endpoint" : "Field Part"}</h2>
          {!isEndpoint ? (
            <button className="icon-button danger" type="button" title="Delete field part" onClick={onDelete}>
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
        {!isEndpoint ? (
          <>
            <label>
              Label
              <input value={node.label} onChange={(event) => onUpdateNode(node.id, { label: event.target.value })} />
            </label>
            {part.category.toLowerCase().includes("hose") ? (
              <label>
                Hose Length, ft
                <input
                  min={0}
                  step={0.1}
                  type="number"
                  value={node.lengthFt ?? 0}
                  onChange={(event) => onUpdateNode(node.id, { lengthFt: Number(event.target.value || 0) })}
                />
              </label>
            ) : null}
            <label>
              Asset / Tag
              <input value={node.tag || ""} onChange={(event) => onUpdateNode(node.id, { tag: event.target.value })} />
            </label>
            <label>
              Notes
              <textarea value={node.notes || ""} onChange={(event) => onUpdateNode(node.id, { notes: event.target.value })} />
            </label>
          </>
        ) : (
          <div className="empty-state compact">Endpoint details are controlled by the customer and truck configuration panels.</div>
        )}
        <dl className="definition-list">
          <dt>Part</dt>
          <dd>{part.name}</dd>
          <dt>Ports</dt>
          <dd>{part.ports.map((port) => port.label).join(" / ")}</dd>
          <dt>Rating</dt>
          <dd>{part.maxPressure} psig</dd>
        </dl>
      </section>
    );
  }

  const edge = graph.connections.find((item) => item.id === selection.id);
  if (!edge) return null;
  const validation = validateFieldConnection(graph, parts, context, edge.from, edge.to);

  return (
    <section className="inspector-section">
      <div className="panel-title-row">
        <h2>Field Connection</h2>
        <button className="icon-button danger" type="button" title="Delete field connection" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>
      <span className={`status-pill status-${validation.status}`}>{validation.title}</span>
      <ul className="plain-list">
        {validation.messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}
