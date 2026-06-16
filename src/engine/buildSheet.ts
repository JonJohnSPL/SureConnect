import { getNode, getPort } from "./lookup";
import { validateConnection } from "./validateConnection";
import type { AssemblyContext, AssemblyGraph, BuildStep, Part } from "./types";

export function getConnectionSteps(
  graph: AssemblyGraph,
  parts: Part[],
  context: AssemblyContext,
): BuildStep[] {
  return graph.connections.map((connection, index) => {
    const fromNode = getNode(graph, connection.from.nodeId);
    const toNode = getNode(graph, connection.to.nodeId);
    const fromPort = getPort(graph, parts, connection.from.nodeId, connection.from.portId);
    const toPort = getPort(graph, parts, connection.to.nodeId, connection.to.portId);
    const validation = validateConnection(graph, parts, context, connection.from, connection.to);

    return {
      index: index + 1,
      title: `${fromNode?.label || ""} -> ${toNode?.label || ""}`,
      detail: `${fromPort?.label || ""} connects to ${toPort?.label || ""}. ${validation.messages.join(" ")}`,
      status: validation.status,
      statusTitle: validation.title,
    };
  });
}

