import type { AssemblyContext, AssemblyGraph, Part } from "../engine";

export const sampleContext: AssemblyContext = {
  gas: "Helium",
  service: "Carrier Gas",
  pressure: 100,
};

export function createSampleAssembly(parts: Part[]): AssemblyGraph {
  const bySlug = new Map(parts.map((part) => [part.slug, part]));
  const partId = (slug: string) => {
    const part = bySlug.get(slug);
    if (!part) throw new Error(`Seeded part missing: ${slug}`);
    return part.id;
  };

  return {
    nodes: [
      { id: "N1", partId: partId("source-he-cyl"), label: "Helium Cylinder", x: 80, y: 160 },
      { id: "N2", partId: partId("reg-2stage-cga580"), label: "Two-Stage Regulator", x: 330, y: 160 },
      { id: "N3", partId: partId("adapter-nptm-to-tube14"), label: "Regulator Outlet Adapter", x: 580, y: 160 },
      { id: "N4", partId: partId("tube-ss-14"), label: "1/4 in SS Tubing", x: 830, y: 160, lengthFt: 4 },
      { id: "N5", partId: partId("valve-shutoff-14"), label: "Carrier Shutoff Valve", x: 1080, y: 160 },
      { id: "N6", partId: partId("reducer-14-18"), label: "1/4 to 1/8 Reducer", x: 1080, y: 330 },
      { id: "N7", partId: partId("tube-ss-18"), label: "1/8 in SS Tubing", x: 830, y: 330, lengthFt: 6 },
      { id: "N8", partId: partId("trap-moisture-18"), label: "Moisture Trap", x: 580, y: 330 },
      { id: "N9", partId: partId("tube-ss-18"), label: "Final 1/8 in SS Tubing", x: 330, y: 330, lengthFt: 3 },
      { id: "N10", partId: partId("gc-carrier-inlet-18"), label: "GC Carrier Inlet", x: 80, y: 330 },
    ],
    connections: [
      { id: "E1", from: { nodeId: "N1", portId: "out" }, to: { nodeId: "N2", portId: "in" } },
      { id: "E2", from: { nodeId: "N2", portId: "out" }, to: { nodeId: "N3", portId: "npt" } },
      { id: "E3", from: { nodeId: "N3", portId: "tube" }, to: { nodeId: "N4", portId: "a" } },
      { id: "E4", from: { nodeId: "N4", portId: "b" }, to: { nodeId: "N5", portId: "in" } },
      { id: "E5", from: { nodeId: "N5", portId: "out" }, to: { nodeId: "N6", portId: "large" } },
      { id: "E6", from: { nodeId: "N6", portId: "small" }, to: { nodeId: "N7", portId: "b" } },
      { id: "E7", from: { nodeId: "N7", portId: "a" }, to: { nodeId: "N8", portId: "out" } },
      { id: "E8", from: { nodeId: "N8", portId: "in" }, to: { nodeId: "N9", portId: "b" } },
      { id: "E9", from: { nodeId: "N9", portId: "a" }, to: { nodeId: "N10", portId: "in" } },
    ],
  };
}

