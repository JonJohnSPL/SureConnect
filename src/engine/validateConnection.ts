import {
  gendersCompatible,
  sizesCompatible,
  threadCompatible,
  typesCompatible,
} from "./compatibility";
import { getNode, getPart, getPort } from "./lookup";
import type {
  AssemblyContext,
  AssemblyGraph,
  Part,
  PortEndpoint,
  ValidationResult,
} from "./types";

export function validateConnection(
  graph: AssemblyGraph,
  parts: Part[],
  context: AssemblyContext,
  a: PortEndpoint,
  b: PortEndpoint,
): ValidationResult {
  const partMap = new Map(parts.map((part) => [part.id, part]));
  const nodeA = getNode(graph, a.nodeId);
  const nodeB = getNode(graph, b.nodeId);
  const portA = getPort(graph, partMap, a.nodeId, a.portId);
  const portB = getPort(graph, partMap, b.nodeId, b.portId);
  const partA = nodeA ? getPart(partMap, nodeA.partId) : undefined;
  const partB = nodeB ? getPart(partMap, nodeB.partId) : undefined;
  const messages: string[] = [];
  const warnings: string[] = [];

  if (!nodeA || !nodeB || !portA || !portB || !partA || !partB) {
    return {
      status: "invalid",
      title: "Missing object",
      messages: ["A node or port no longer exists."],
    };
  }

  if (a.nodeId === b.nodeId) {
    return {
      status: "invalid",
      title: "Same-part connection",
      messages: ["A part cannot connect to itself."],
    };
  }

  if (!typesCompatible(portA, portB)) {
    messages.push(`Port types do not mate: ${portA.type} to ${portB.type}.`);
  }
  if (!sizesCompatible(portA, portB)) {
    messages.push(`Size mismatch: ${portA.size || "none"} to ${portB.size || "none"}.`);
  }
  if (!gendersCompatible(portA, portB)) {
    messages.push(`Gender/interface mismatch: ${portA.gender} to ${portB.gender}.`);
  }
  if (!threadCompatible(portA, portB)) {
    messages.push(`Thread standard mismatch: ${portA.thread || "none"} to ${portB.thread || "none"}.`);
  }

  const minPressure = Math.min(partA.maxPressure || Infinity, partB.maxPressure || Infinity);
  if (Number(context.pressure) > minPressure) {
    messages.push(
      `Operating pressure ${context.pressure} psig exceeds the lowest connected part rating of ${minPressure} psig.`,
    );
  }

  if (!partA.gases.includes(context.gas)) {
    warnings.push(`${partA.name} is not approved in this library for ${context.gas}.`);
  }
  if (!partB.gases.includes(context.gas)) {
    warnings.push(`${partB.name} is not approved in this library for ${context.gas}.`);
  }

  if ((portA.sealant === "required" || portB.sealant === "required") && (portA.type === "NPT" || portB.type === "NPT")) {
    warnings.push("NPT side requires approved thread sealant/tape per SOP. Keep sealant out of flow path.");
  }
  if (portA.ferrule || portB.ferrule || portA.type.includes("tube") || portB.type.includes("tube")) {
    warnings.push("Compression/tube connection: verify clean square cut, deburr, correct ferrules, and gauge/inspection where applicable.");
  }

  if (messages.length) {
    return { status: "invalid", title: "Blocked connection", messages: messages.concat(warnings) };
  }
  if (warnings.length) {
    return { status: "warn", title: "Allowed with verification", messages: warnings };
  }
  return { status: "valid", title: "Allowed connection", messages: ["Connection attributes are compatible."] };
}

