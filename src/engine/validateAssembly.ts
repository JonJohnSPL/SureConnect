import { getNode, getNodePart } from "./lookup";
import { validateConnection } from "./validateConnection";
import type { AssemblyContext, AssemblyGraph, AssemblyIssue, Part } from "./types";

export function validateAssembly(
  graph: AssemblyGraph,
  parts: Part[],
  context: AssemblyContext,
): AssemblyIssue[] {
  const issues: AssemblyIssue[] = [];
  const connectedPorts = new Set<string>();
  const partMap = new Map(parts.map((part) => [part.id, part]));

  graph.connections.forEach((connection) => {
    connectedPorts.add(`${connection.from.nodeId}:${connection.from.portId}`);
    connectedPorts.add(`${connection.to.nodeId}:${connection.to.portId}`);
    const validation = validateConnection(graph, parts, context, connection.from, connection.to);
    if (validation.status !== "valid") {
      const fromNode = getNode(graph, connection.from.nodeId);
      const toNode = getNode(graph, connection.to.nodeId);
      issues.push({
        status: validation.status,
        title: `${validation.title}: ${fromNode?.label || connection.from.nodeId} -> ${toNode?.label || connection.to.nodeId}`,
        message: validation.messages.join(" "),
      });
    }
  });

  graph.nodes.forEach((node) => {
    const part = getNodePart(graph, partMap, node.id);
    if (!part) {
      issues.push({
        status: "invalid",
        title: "Missing part",
        message: `${node.label} references a part that is no longer available.`,
      });
      return;
    }

    if (!part.gases.includes(context.gas)) {
      issues.push({
        status: "warn",
        title: "Gas compatibility review",
        message: `${part.name} is not approved in this library for ${context.gas}.`,
      });
    }
    if (Number(context.pressure) > part.maxPressure) {
      issues.push({
        status: "invalid",
        title: "Pressure rating exceeded",
        message: `${part.name} max rating ${part.maxPressure} psig is below current operating pressure ${context.pressure} psig.`,
      });
    }

    part.ports.forEach((port) => {
      const key = `${node.id}:${port.id}`;
      if (!connectedPorts.has(key) && !part.category.includes("Caps")) {
        issues.push({
          status: "warn",
          title: "Open port",
          message: `${node.label} has an unconnected port: ${port.label}. Cap, connect, or document as intentionally open/vented.`,
        });
      }
    });
  });

  const graphParts = graph.nodes
    .map((node) => getNodePart(graph, partMap, node.id))
    .filter((part): part is Part => Boolean(part));
  const hasSource = graphParts.some((part) => part.category === "Gas Sources");
  const hasRegulator = graphParts.some(
    (part) => part.category === "Pressure Control" && part.name.toLowerCase().includes("regulator"),
  );
  const hasGc = graphParts.some((part) => part.category === "GC Instrument Ports");

  if (hasSource && !hasRegulator) {
    issues.push({
      status: "invalid",
      title: "Missing regulator",
      message: "A cylinder/source is present without a regulator in the assembly.",
    });
  }
  if (context.service.includes("Carrier") && !hasGc) {
    issues.push({
      status: "warn",
      title: "Missing instrument endpoint",
      message: "Carrier gas service should terminate at a GC carrier gas inlet or approved endpoint.",
    });
  }

  return issues;
}

