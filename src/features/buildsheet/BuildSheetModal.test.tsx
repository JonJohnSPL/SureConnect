import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { AssemblyContext, AssemblyGraph } from "../../engine";
import { BuildSheetModal } from "./BuildSheetModal";

const context: AssemblyContext = {
  gas: "Helium",
  service: "Carrier Gas",
  pressure: 100,
};

const graph: AssemblyGraph = {
  nodes: [
    { id: "N1", partId: "source", label: "Source", x: 0, y: 0 },
    { id: "N2", partId: "regulator", label: "Regulator", x: 200, y: 0 },
  ],
  connections: [{ id: "E1", from: { nodeId: "N1", portId: "out" }, to: { nodeId: "N2", portId: "in" } }],
};

describe("BuildSheetModal", () => {
  it("renders full build sheet content and prints", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const onClose = vi.fn();

    render(
      <BuildSheetModal
        assemblyName="Sample Carrier Gas Build"
        bom={[
          {
            partId: "tube",
            name: "1/8 in Tube",
            partNumber: "TUBE-18",
            manufacturer: "Vendor",
            qty: 2,
            lengthFt: 6,
            isTubing: true,
          },
        ]}
        context={context}
        graph={graph}
        issues={[
          {
            status: "warn",
            title: "Open port",
            message: "A port needs a cap.",
          },
        ]}
        onClose={onClose}
        open
        steps={[
          {
            index: 1,
            title: "Source -> Regulator",
            detail: "CGA connects to CGA.",
            status: "valid",
            statusTitle: "Allowed connection",
          },
        ]}
      />,
    );

    expect(screen.getByRole("dialog", { name: /Connection Master Build Sheet/i })).toBeInTheDocument();
    expect(screen.getByText("Sample Carrier Gas Build")).toBeInTheDocument();
    expect(screen.getByText("REVIEW REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("Assembly Summary")).toBeInTheDocument();
    expect(screen.getByText("Bill of Materials")).toBeInTheDocument();
    expect(screen.getByText("Connection-by-Connection Build Steps")).toBeInTheDocument();
    expect(screen.getByText("Validation Warnings / Blocks")).toBeInTheDocument();
    expect(screen.getByText("Required Physical Checks")).toBeInTheDocument();
    expect(screen.getByText("Signoff")).toBeInTheDocument();
    expect(screen.getByText("Tubing length from drawing. Verify actual routing length before cutting.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Print \/ Save PDF/i }));
    expect(printSpy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();

    printSpy.mockRestore();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <BuildSheetModal
        assemblyName="Closed"
        bom={[]}
        context={context}
        graph={{ nodes: [], connections: [] }}
        issues={[]}
        onClose={() => undefined}
        open={false}
        steps={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

