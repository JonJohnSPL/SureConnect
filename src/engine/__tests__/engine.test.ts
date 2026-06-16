import { describe, expect, it } from "vitest";
import {
  getBOM,
  getConnectionSteps,
  gendersCompatible,
  sizesCompatible,
  threadCompatible,
  typesCompatible,
  validateAssembly,
  validateConnection,
} from "../index";
import type { AssemblyContext, AssemblyGraph, Part, Port } from "../types";

const context: AssemblyContext = {
  gas: "Helium",
  service: "Carrier Gas",
  pressure: 100,
};

function port(overrides: Partial<Port>): Port {
  return {
    id: "p",
    label: "Port",
    type: "CGA",
    size: "CGA-580",
    gender: "female",
    side: "right",
    ...overrides,
  };
}

function part(overrides: Partial<Part>): Part {
  return {
    id: "part-a",
    slug: "part-a",
    category: "Adapters",
    icon: "ADP",
    name: "Part A",
    manufacturer: "Vendor",
    partNumber: "A-1",
    material: "316 SS",
    maxPressure: 500,
    gases: ["Helium"],
    approved: true,
    ports: [port({ id: "a" })],
    ...overrides,
  };
}

function graph(parts: Part[]): AssemblyGraph {
  return {
    nodes: parts.map((item, index) => ({
      id: `N${index + 1}`,
      partId: item.id,
      label: item.name,
      x: index * 200,
      y: 100,
      lengthFt: item.category === "Tubing" ? 3 : null,
    })),
    connections: [{ id: "E1", from: { nodeId: "N1", portId: "a" }, to: { nodeId: "N2", portId: "b" } }],
  };
}

describe("compatibility helpers", () => {
  it("accepts compatible types and rejects incompatible types", () => {
    expect(typesCompatible(port({ type: "tube_end" }), port({ type: "tube_receiver" }))).toBe(true);
    expect(typesCompatible(port({ type: "CGA" }), port({ type: "NPT" }))).toBe(false);
  });

  it("checks sizes, genders, and NPT threads", () => {
    expect(sizesCompatible(port({ size: "1/8 in" }), port({ size: "1/8 in" }))).toBe(true);
    expect(sizesCompatible(port({ size: "1/8 in" }), port({ size: "1/4 in" }))).toBe(false);
    expect(gendersCompatible(port({ gender: "plug" }), port({ gender: "socket" }))).toBe(true);
    expect(gendersCompatible(port({ gender: "female" }), port({ gender: "female" }))).toBe(false);
    expect(threadCompatible(port({ type: "NPT", thread: "NPT" }), port({ type: "NPT", thread: "NPT" }))).toBe(true);
    expect(threadCompatible(port({ type: "NPT", thread: "NPT" }), port({ type: "NPT", thread: "BSPT" }))).toBe(false);
  });
});

describe("connection validation", () => {
  it("allows a clean CGA male/female connection", () => {
    const source = part({ id: "source", name: "Source", category: "Gas Sources", ports: [port({ id: "a", gender: "female" })] });
    const regulator = part({
      id: "reg",
      name: "Regulator",
      category: "Pressure Control",
      ports: [port({ id: "b", gender: "male" })],
    });
    const assembly = graph([source, regulator]);

    expect(validateConnection(assembly, [source, regulator], context, assembly.connections[0].from, assembly.connections[0].to)).toMatchObject({
      status: "valid",
      title: "Allowed connection",
    });
  });

  it("blocks same-part connections and missing objects", () => {
    const one = part({ id: "one", ports: [port({ id: "a" }), port({ id: "b", gender: "male" })] });
    const assembly: AssemblyGraph = {
      nodes: [{ id: "N1", partId: one.id, label: "One", x: 0, y: 0 }],
      connections: [],
    };

    expect(validateConnection(assembly, [one], context, { nodeId: "N1", portId: "a" }, { nodeId: "N1", portId: "b" }).status).toBe("invalid");
    expect(validateConnection(assembly, [one], context, { nodeId: "N1", portId: "a" }, { nodeId: "N2", portId: "b" }).title).toBe("Missing object");
  });

  it("blocks incompatible type, size, gender, thread, and pressure cases", () => {
    const a = part({
      id: "a",
      maxPressure: 50,
      ports: [port({ id: "a", type: "NPT", size: "1/4 in", gender: "female", thread: "NPT" })],
    });
    const b = part({
      id: "b",
      ports: [port({ id: "b", type: "quick_connect", size: "1/8 in", gender: "female", thread: "BSPT" })],
    });
    const assembly = graph([a, b]);
    const result = validateConnection(assembly, [a, b], context, assembly.connections[0].from, assembly.connections[0].to);

    expect(result.status).toBe("invalid");
    expect(result.messages.join(" ")).toContain("Port types do not mate");
    expect(result.messages.join(" ")).toContain("Size mismatch");
    expect(result.messages.join(" ")).toContain("Gender/interface mismatch");
    expect(result.messages.join(" ")).toContain("Thread standard mismatch");
    expect(result.messages.join(" ")).toContain("exceeds the lowest connected part rating");
  });

  it("supports quick-connect plug/socket enforcement", () => {
    const plug = part({ id: "plug", ports: [port({ id: "a", type: "quick_connect", size: "1/4 in", gender: "plug" })] });
    const socket = part({ id: "socket", ports: [port({ id: "b", type: "quick_connect", size: "1/4 in", gender: "socket" })] });
    const badSocket = part({ id: "bad", ports: [port({ id: "b", type: "quick_connect", size: "1/4 in", gender: "socket" })] });
    const validGraph = graph([plug, socket]);
    const invalidGraph = graph([socket, badSocket]);

    expect(validateConnection(validGraph, [plug, socket], context, validGraph.connections[0].from, validGraph.connections[0].to).status).toBe("valid");
    expect(validateConnection(invalidGraph, [socket, badSocket], context, invalidGraph.connections[0].from, invalidGraph.connections[0].to).status).toBe("invalid");
  });

  it("warns for gas review and tube/ferrule checks", () => {
    const tube = part({
      id: "tube",
      category: "Tubing",
      gases: ["Nitrogen"],
      ports: [port({ id: "a", type: "tube_end", size: "1/8 in", gender: "tube" })],
    });
    const receiver = part({
      id: "receiver",
      ports: [port({ id: "b", type: "tube_receiver", size: "1/8 in", gender: "receiver", ferrule: true })],
    });
    const assembly = graph([tube, receiver]);
    const result = validateConnection(assembly, [tube, receiver], context, assembly.connections[0].from, assembly.connections[0].to);

    expect(result.status).toBe("warn");
    expect(result.messages.join(" ")).toContain("not approved");
    expect(result.messages.join(" ")).toContain("Compression/tube connection");
  });
});

describe("assembly deliverables", () => {
  it("reports open ports, missing regulator, and missing GC endpoint", () => {
    const source = part({
      id: "source",
      name: "Helium Cylinder",
      category: "Gas Sources",
      ports: [port({ id: "a" }), port({ id: "unused" })],
    });
    const assembly: AssemblyGraph = {
      nodes: [{ id: "N1", partId: source.id, label: "Cylinder", x: 0, y: 0 }],
      connections: [],
    };
    const issues = validateAssembly(assembly, [source], context);

    expect(issues.some((issue) => issue.title === "Open port")).toBe(true);
    expect(issues.some((issue) => issue.title === "Missing regulator" && issue.status === "invalid")).toBe(true);
    expect(issues.some((issue) => issue.title === "Missing instrument endpoint")).toBe(true);
  });

  it("calculates BOM tubing length", () => {
    const tube = part({ id: "tube", category: "Tubing", name: "1/8 in Tube", partNumber: "TUBE-18" });
    const assembly: AssemblyGraph = {
      nodes: [
        { id: "N1", partId: tube.id, label: "Run 1", x: 0, y: 0, lengthFt: 2 },
        { id: "N2", partId: tube.id, label: "Run 2", x: 100, y: 0, lengthFt: 4.5 },
      ],
      connections: [],
    };

    expect(getBOM(assembly, [tube])).toEqual([
      expect.objectContaining({ qty: 2, lengthFt: 6.5, isTubing: true }),
    ]);
  });

  it("generates connection build steps with validation status", () => {
    const source = part({ id: "source", name: "Source", ports: [port({ id: "a", gender: "female" })] });
    const regulator = part({ id: "reg", name: "Regulator", ports: [port({ id: "b", gender: "male" })] });
    const assembly = graph([source, regulator]);

    expect(getConnectionSteps(assembly, [source, regulator], context)).toEqual([
      expect.objectContaining({
        index: 1,
        title: "Source -> Regulator",
        status: "valid",
      }),
    ]);
  });
});

