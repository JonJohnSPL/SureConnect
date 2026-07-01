import type { Part } from "../engine";
import {
  createInitialFieldGraph,
  customerEndpointId,
  getFieldBOM,
  getFieldConnectionSteps,
  truckEndpointId,
  validateFieldRigUp,
} from "./engine";
import { defaultFieldContext } from "./options";
import type { FieldRigUpGraph } from "./types";

const adapter: Part = {
  id: "adapter",
  slug: "field-adapter-2-ansi150-to-2-camlock",
  category: "Field Adapters",
  icon: "ADP",
  name: "2 in ANSI 150 RF to 2 in Camlock",
  manufacturer: "Planning Catalog",
  partNumber: "FIELD-ADP-2-150-CAM",
  material: "Carbon steel",
  maxPressure: 250,
  gases: ["Hydrocarbon"],
  notes: "Planning aid / spec-review required.",
  approved: true,
  ports: [
    { id: "flange", label: "2 in ANSI 150 RF", type: "field_flange_ansi_150_rf", size: "2 in", gender: "bidirectional", side: "left" },
    { id: "camlock", label: "2 in Camlock", type: "field_camlock", size: "2 in", gender: "bidirectional", side: "right" },
  ],
};

const hose: Part = {
  id: "hose",
  slug: "field-hose-2-camlock-10",
  category: "Field Hoses",
  icon: "HSE",
  name: "2 in HP Armored Hose, 10 ft",
  manufacturer: "Planning Catalog",
  partNumber: "FIELD-HOSE-2-CAMLOCK-10",
  material: "Armored hose",
  maxPressure: 250,
  gases: ["Hydrocarbon"],
  defaultLengthFt: 10,
  notes: "Planning aid / spec-review required.",
  approved: true,
  ports: [
    { id: "a", label: "2 in Camlock", type: "field_camlock", size: "2 in", gender: "bidirectional", side: "left" },
    { id: "b", label: "2 in Camlock", type: "field_camlock", size: "2 in", gender: "bidirectional", side: "right" },
  ],
};

function completeGraph(): FieldRigUpGraph {
  return {
    nodes: [
      ...createInitialFieldGraph().nodes,
      { id: "FN1", kind: "part", partId: adapter.id, label: adapter.name, x: 320, y: 180 },
      { id: "FN2", kind: "part", partId: hose.id, label: hose.name, x: 620, y: 180, lengthFt: 10 },
    ],
    connections: [
      { id: "FE1", from: { nodeId: customerEndpointId, portId: "out" }, to: { nodeId: "FN1", portId: "flange" } },
      { id: "FE2", from: { nodeId: "FN1", portId: "camlock" }, to: { nodeId: "FN2", portId: "a" } },
      { id: "FE3", from: { nodeId: "FN2", portId: "b" }, to: { nodeId: truckEndpointId, portId: "in" } },
    ],
  };
}

describe("field engine", () => {
  it("blocks a rig-up when customer and truck endpoints are not connected", () => {
    const issues = validateFieldRigUp(createInitialFieldGraph(), [adapter, hose], defaultFieldContext);

    expect(issues.some((issue) => issue.title === "Customer endpoint not connected")).toBe(true);
    expect(issues.some((issue) => issue.title === "Truck endpoint not connected")).toBe(true);
    expect(issues.some((issue) => issue.title === "Customer-to-truck path incomplete")).toBe(true);
  });

  it("accepts a compatible customer-to-truck path while keeping planning-aid warnings", () => {
    const issues = validateFieldRigUp(completeGraph(), [adapter, hose], defaultFieldContext);

    expect(issues.some((issue) => issue.status === "invalid")).toBe(false);
    expect(issues.some((issue) => issue.title === "Field spec review required")).toBe(true);
  });

  it("flags size and interface mismatches", () => {
    const context = {
      ...defaultFieldContext,
      customer: { ...defaultFieldContext.customer, size: "3 in", rating: "ANSI 300 RF" },
    };
    const issues = validateFieldRigUp(completeGraph(), [adapter, hose], context);

    expect(issues.some((issue) => issue.status === "invalid" && issue.message.includes("Size mismatch"))).toBe(true);
    expect(issues.some((issue) => issue.status === "invalid" && issue.message.includes("Connection standards do not mate"))).toBe(true);
  });

  it("generates field BOM and rig-up steps", () => {
    const graph = completeGraph();
    const bom = getFieldBOM(graph, [adapter, hose]);
    const steps = getFieldConnectionSteps(graph, [adapter, hose], defaultFieldContext);

    expect(bom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ partId: "hose", qty: 1, lengthFt: 10 }),
        expect.objectContaining({ partId: "adapter", qty: 1 }),
      ]),
    );
    expect(steps).toHaveLength(3);
    expect(steps[0].title).toMatch(/Customer/);
  });
});
