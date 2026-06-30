import { render, screen } from "@testing-library/react";
import type { Part } from "../../engine";
import { getPartVisualType, PartVisual, type PartVisualType } from "./PartVisual";

function makePart(overrides: Partial<Part>): Part {
  return {
    id: "part",
    slug: "part",
    category: "Adapters",
    icon: "PRT",
    name: "Part",
    manufacturer: "Vendor",
    partNumber: "PART-1",
    material: "316 SS",
    maxPressure: 1000,
    gases: ["Helium"],
    ports: [],
    ...overrides,
  };
}

describe("PartVisual", () => {
  it.each<[Partial<Part>, PartVisualType]>([
    [{ slug: "source-he-cyl", name: "Helium Cylinder / Source", category: "Gas Sources" }, "cylinder"],
    [{ name: "Two-Stage Regulator CGA-580", category: "Pressure Control" }, "regulator"],
    [{ name: "1/4 MNPT x 1/4 Tube Adapter", category: "Adapters" }, "adapter"],
    [{ name: "1/8 in 316 SS Tubing", category: "Tubing" }, "tubing"],
    [{ name: "1/4 in Tube Shutoff Valve", category: "Valves" }, "valve"],
    [{ name: "1/8 in Tube Needle Valve", category: "Valves" }, "needleValve"],
    [{ name: "1/4 Tube x 1/8 Tube Reducer Union", category: "Adapters" }, "reducer"],
    [{ name: "1/8 in Moisture Trap", category: "Traps / Filters" }, "trap"],
    [{ name: "1/4 in Quick-Connect Plug", category: "Quick Connects" }, "quickPlug"],
    [{ name: "1/4 in Quick-Connect Socket", category: "Quick Connects" }, "quickSocket"],
    [{ name: "GC Carrier Gas Inlet 1/8 Tube", category: "GC Instrument Ports" }, "gcPort"],
    [{ name: "1/8 in Tube Cap", category: "Caps / Plugs" }, "cap"],
    [{ name: "Mystery Component", category: "Other" }, "generic"],
  ])("maps parts to %s visuals", (overrides, expected) => {
    expect(getPartVisualType(makePart(overrides))).toBe(expected);
  });

  it("renders a labelled SVG with the selected visual type", () => {
    render(<PartVisual part={makePart({ name: "GC Carrier Gas Inlet", category: "GC Instrument Ports" })} />);

    expect(screen.getByRole("img", { name: /GC Carrier Gas Inlet visual/i })).toHaveAttribute(
      "data-visual-type",
      "gcPort",
    );
  });
});

