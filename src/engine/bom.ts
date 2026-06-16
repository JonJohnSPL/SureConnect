import { getPart } from "./lookup";
import type { AssemblyGraph, BomItem, Part } from "./types";

export function getBOM(graph: AssemblyGraph, parts: Part[]): BomItem[] {
  const partMap = new Map(parts.map((part) => [part.id, part]));
  const bom = new Map<string, BomItem>();

  graph.nodes.forEach((node) => {
    const part = getPart(partMap, node.partId);
    if (!part) return;
    if (!bom.has(part.id)) {
      bom.set(part.id, {
        partId: part.id,
        name: part.name,
        partNumber: part.partNumber,
        manufacturer: part.manufacturer,
        qty: 0,
        lengthFt: 0,
        isTubing: part.category === "Tubing",
      });
    }
    const item = bom.get(part.id);
    if (!item) return;
    item.qty += 1;
    if (item.isTubing) item.lengthFt += Number(node.lengthFt || 0);
  });

  return [...bom.values()].sort((a, b) => a.name.localeCompare(b.name));
}

