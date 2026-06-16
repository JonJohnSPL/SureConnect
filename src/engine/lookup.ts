import type { AssemblyGraph, AssemblyNode, Part, Port } from "./types";

export function createPartMap(parts: Part[]): Map<string, Part> {
  return new Map(parts.map((part) => [part.id, part]));
}

export function getNode(graph: AssemblyGraph, nodeId: string): AssemblyNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

export function getPart(parts: Part[] | Map<string, Part>, partId: string): Part | undefined {
  return parts instanceof Map ? parts.get(partId) : parts.find((part) => part.id === partId);
}

export function getNodePart(
  graph: AssemblyGraph,
  parts: Part[] | Map<string, Part>,
  nodeId: string,
): Part | undefined {
  const node = getNode(graph, nodeId);
  return node ? getPart(parts, node.partId) : undefined;
}

export function getPort(
  graph: AssemblyGraph,
  parts: Part[] | Map<string, Part>,
  nodeId: string,
  portId: string,
): Port | undefined {
  const part = getNodePart(graph, parts, nodeId);
  return part?.ports.find((port) => port.id === portId);
}

