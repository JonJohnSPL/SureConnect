import { gendersCompatible, sizesCompatible, typesCompatible } from "../engine/compatibility";
import type { AssemblyIssue, BomItem, BuildStep, Part, Port, PortEndpoint, ValidationStatus } from "../engine";
import { defaultFieldContext } from "./options";
import type { FieldEndpointKind, FieldRigUpContext, FieldRigUpGraph, FieldRigUpNode } from "./types";

export const customerEndpointId = "FIELD_CUSTOMER";
export const truckEndpointId = "FIELD_TRUCK";
export const customerEndpointPartId = "__field_customer_endpoint__";
export const truckEndpointPartId = "__field_truck_endpoint__";

const fieldPlanningAidMessage = "Planning aid catalog entry: verify approved specs, MAOP, gasket/seal requirements, and actual part number before use.";

export function createInitialFieldGraph(): FieldRigUpGraph {
  return {
    nodes: [
      {
        id: customerEndpointId,
        kind: "endpoint",
        endpoint: "customer",
        label: "Customer Meter",
        x: 80,
        y: 180,
      },
      {
        id: truckEndpointId,
        kind: "endpoint",
        endpoint: "truck",
        label: "Prover Truck",
        x: 1120,
        y: 180,
      },
    ],
    connections: [],
  };
}

export function ensureFieldEndpoints(graph: FieldRigUpGraph): FieldRigUpGraph {
  const initial = createInitialFieldGraph();
  const nodes = [...graph.nodes];
  initial.nodes.forEach((endpoint) => {
    if (!nodes.some((node) => node.id === endpoint.id)) nodes.push(endpoint);
  });
  return { ...graph, nodes };
}

export function getFieldConnectionType(value: string): string {
  const normalized = value.toLowerCase().replace(/["]/g, "").replace(/\s+/g, " ").trim();
  if (normalized.includes("camlock")) return "field_camlock";
  if (normalized.includes("hammer union")) return "field_hammer_union";
  return `field_${normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

export function getFieldFlangeType(rating: string): string {
  return `field_flange_${rating.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

export function parseFieldSize(value: string): string {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? `${match[1]} in` : value;
}

export function getVirtualFieldEndpointPart(endpoint: FieldEndpointKind, context: FieldRigUpContext): Part {
  if (endpoint === "customer") {
    return {
      id: customerEndpointPartId,
      slug: "field-customer-endpoint",
      category: "Field Endpoints",
      icon: "MTR",
      name: `${context.customer.meterType} ${context.customer.endpointType}`,
      manufacturer: "Customer",
      partNumber: `${context.customer.size} ${context.customer.rating}`,
      material: "Field connection",
      maxPressure: context.pressure,
      gases: ["Crude Oil", "Refined Product", "Water", "Hydrocarbon"],
      notes: "Customer-side virtual endpoint.",
      approved: true,
      ports: [
        {
          id: "out",
          label: `${context.customer.size} ${context.customer.rating}`,
          type: getFieldFlangeType(context.customer.rating),
          size: context.customer.size,
          gender: "bidirectional",
          side: "right",
        },
      ],
    };
  }

  return {
    id: truckEndpointPartId,
    slug: "field-truck-endpoint",
    category: "Field Endpoints",
    icon: "TRK",
    name: context.truck.type,
    manufacturer: "Sure Connect",
    partNumber: context.truck.connection,
    material: "Truck connection",
    maxPressure: context.pressure,
    gases: ["Crude Oil", "Refined Product", "Water", "Hydrocarbon"],
    notes: "Truck-side virtual endpoint.",
    approved: true,
    ports: [
      {
        id: "in",
        label: context.truck.connection,
        type: getFieldConnectionType(context.truck.connection),
        size: parseFieldSize(context.truck.connection),
        gender: "bidirectional",
        side: "left",
      },
    ],
  };
}

export function getFieldNodePart(node: FieldRigUpNode | undefined, parts: Part[], context: FieldRigUpContext): Part | undefined {
  if (!node) return undefined;
  if (node.kind === "endpoint" && node.endpoint) return getVirtualFieldEndpointPart(node.endpoint, context);
  return parts.find((part) => part.id === node.partId);
}

export function getFieldPort(node: FieldRigUpNode | undefined, parts: Part[], context: FieldRigUpContext, portId: string): Port | undefined {
  return getFieldNodePart(node, parts, context)?.ports.find((port) => port.id === portId);
}

function issueStatus(results: { status: ValidationStatus }[]): ValidationStatus {
  if (results.some((result) => result.status === "invalid")) return "invalid";
  if (results.some((result) => result.status === "warn")) return "warn";
  return "valid";
}

function isPlanningAid(part: Part): boolean {
  const notes = (part.notes || "").toLowerCase();
  return part.category.startsWith("Field") && (part.maxPressure <= 0 || notes.includes("planning aid") || notes.includes("spec-review"));
}

export function validateFieldConnection(
  graph: FieldRigUpGraph,
  parts: Part[],
  context: FieldRigUpContext,
  a: PortEndpoint,
  b: PortEndpoint,
) {
  const nodeA = graph.nodes.find((node) => node.id === a.nodeId);
  const nodeB = graph.nodes.find((node) => node.id === b.nodeId);
  const partA = getFieldNodePart(nodeA, parts, context);
  const partB = getFieldNodePart(nodeB, parts, context);
  const portA = getFieldPort(nodeA, parts, context, a.portId);
  const portB = getFieldPort(nodeB, parts, context, b.portId);
  const messages: string[] = [];
  const warnings: string[] = [];

  if (!nodeA || !nodeB || !partA || !partB || !portA || !portB) {
    return { status: "invalid" as const, title: "Missing object", messages: ["A field node or port no longer exists."] };
  }

  if (a.nodeId === b.nodeId) {
    return { status: "invalid" as const, title: "Same-part connection", messages: ["A field part cannot connect to itself."] };
  }

  if (!typesCompatible(portA, portB)) messages.push(`Connection standards do not mate: ${portA.label} to ${portB.label}.`);
  if (!sizesCompatible(portA, portB)) messages.push(`Size mismatch: ${portA.size || "none"} to ${portB.size || "none"}.`);
  if (!gendersCompatible(portA, portB)) messages.push(`Interface mismatch: ${portA.gender} to ${portB.gender}.`);

  const minPressure = Math.min(partA.maxPressure || Infinity, partB.maxPressure || Infinity);
  if (Number(context.pressure) > minPressure) {
    messages.push(`Operating pressure ${context.pressure} psig exceeds the lowest connected part rating of ${minPressure} psig.`);
  }

  if (isPlanningAid(partA)) warnings.push(`${partA.name}: ${fieldPlanningAidMessage}`);
  if (isPlanningAid(partB)) warnings.push(`${partB.name}: ${fieldPlanningAidMessage}`);

  if (messages.length) return { status: "invalid" as const, title: "Blocked field connection", messages: messages.concat(warnings) };
  if (warnings.length) return { status: "warn" as const, title: "Spec review required", messages: warnings };
  return { status: "valid" as const, title: "Allowed field connection", messages: ["Connection attributes are compatible."] };
}

function connectedPortKeys(graph: FieldRigUpGraph): Set<string> {
  const connected = new Set<string>();
  graph.connections.forEach((connection) => {
    connected.add(`${connection.from.nodeId}:${connection.from.portId}`);
    connected.add(`${connection.to.nodeId}:${connection.to.portId}`);
  });
  return connected;
}

function hasPath(graph: FieldRigUpGraph, startId: string, endId: string): boolean {
  const queue = [startId];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (current === endId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    graph.connections.forEach((connection) => {
      if (connection.from.nodeId === current) queue.push(connection.to.nodeId);
      if (connection.to.nodeId === current) queue.push(connection.from.nodeId);
    });
  }
  return false;
}

export function validateFieldRigUp(
  graphInput: FieldRigUpGraph,
  parts: Part[],
  context: FieldRigUpContext = defaultFieldContext,
): AssemblyIssue[] {
  const graph = ensureFieldEndpoints(graphInput);
  const issues: AssemblyIssue[] = [];
  const connected = connectedPortKeys(graph);

  graph.connections.forEach((connection) => {
    const validation = validateFieldConnection(graph, parts, context, connection.from, connection.to);
    if (validation.status !== "valid") {
      const fromNode = graph.nodes.find((node) => node.id === connection.from.nodeId);
      const toNode = graph.nodes.find((node) => node.id === connection.to.nodeId);
      issues.push({
        status: validation.status,
        title: `${validation.title}: ${fromNode?.label || connection.from.nodeId} -> ${toNode?.label || connection.to.nodeId}`,
        message: validation.messages.join(" "),
      });
    }
  });

  graph.nodes.forEach((node) => {
    const part = getFieldNodePart(node, parts, context);
    if (!part) {
      issues.push({
        status: "invalid",
        title: "Missing field part",
        message: `${node.label} references a part that is no longer available.`,
      });
      return;
    }

    if (node.kind === "endpoint") {
      part.ports.forEach((port) => {
        if (!connected.has(`${node.id}:${port.id}`)) {
          issues.push({
            status: "invalid",
            title: `${node.endpoint === "customer" ? "Customer" : "Truck"} endpoint not connected`,
            message: `${node.label} must be connected before a field rig-up can be used.`,
          });
        }
      });
      return;
    }

    if (Number(context.pressure) > part.maxPressure && part.maxPressure > 0) {
      issues.push({
        status: "invalid",
        title: "Pressure rating exceeded",
        message: `${part.name} max rating ${part.maxPressure} psig is below field pressure ${context.pressure} psig.`,
      });
    }

    if (isPlanningAid(part)) {
      issues.push({
        status: "warn",
        title: "Field spec review required",
        message: `${part.name}: ${fieldPlanningAidMessage}`,
      });
    }

    part.ports.forEach((port) => {
      if (!connected.has(`${node.id}:${port.id}`)) {
        issues.push({
          status: "warn",
          title: "Open field port",
          message: `${node.label} has an unconnected port: ${port.label}. Connect, cap, blind, or document before use.`,
        });
      }
    });
  });

  if (!hasPath(graph, customerEndpointId, truckEndpointId)) {
    issues.push({
      status: "invalid",
      title: "Customer-to-truck path incomplete",
      message: "The rig-up must have a continuous connected path from the customer endpoint to the truck endpoint.",
    });
  }

  return issues;
}

export function getFieldBOM(graphInput: FieldRigUpGraph, parts: Part[]): BomItem[] {
  const graph = ensureFieldEndpoints(graphInput);
  const partMap = new Map(parts.map((part) => [part.id, part]));
  const bom = new Map<string, BomItem>();

  graph.nodes.forEach((node) => {
    if (node.kind !== "part" || !node.partId) return;
    const part = partMap.get(node.partId);
    if (!part) return;
    if (!bom.has(part.id)) {
      bom.set(part.id, {
        partId: part.id,
        name: part.name,
        partNumber: part.partNumber,
        manufacturer: part.manufacturer,
        qty: 0,
        lengthFt: 0,
        isTubing: part.category.toLowerCase().includes("hose"),
      });
    }
    const item = bom.get(part.id);
    if (!item) return;
    item.qty += 1;
    if (item.isTubing) item.lengthFt += Number(node.lengthFt ?? part.defaultLengthFt ?? 0);
  });

  return [...bom.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getFieldConnectionSteps(
  graphInput: FieldRigUpGraph,
  parts: Part[],
  context: FieldRigUpContext = defaultFieldContext,
): BuildStep[] {
  const graph = ensureFieldEndpoints(graphInput);
  return graph.connections.map((connection, index) => {
    const fromNode = graph.nodes.find((node) => node.id === connection.from.nodeId);
    const toNode = graph.nodes.find((node) => node.id === connection.to.nodeId);
    const fromPort = getFieldPort(fromNode, parts, context, connection.from.portId);
    const toPort = getFieldPort(toNode, parts, context, connection.to.portId);
    const validation = validateFieldConnection(graph, parts, context, connection.from, connection.to);

    return {
      index: index + 1,
      title: `${fromNode?.label || ""} -> ${toNode?.label || ""}`,
      detail: `${fromPort?.label || ""} connects to ${toPort?.label || ""}. ${validation.messages.join(" ")}`,
      status: validation.status,
      statusTitle: validation.title,
    };
  });
}

export function getFieldStatus(issues: AssemblyIssue[], graph: FieldRigUpGraph): { label: string; className: string; status: string } {
  const status = issueStatus(issues);
  if (status === "invalid") return { label: "Blocked", className: "invalid", status: "draft" };
  if (status === "warn") return { label: "Review Required", className: "warn", status: "in_review" };
  if (graph.connections.length) return { label: "Valid Draft", className: "valid", status: "validated" };
  return { label: "Draft", className: "draft", status: "draft" };
}
