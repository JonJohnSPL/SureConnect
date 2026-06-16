import { render, screen } from "@testing-library/react";
import { BuildSheetPanels } from "./BuildSheetPanels";

describe("BuildSheetPanels", () => {
  it("renders validation issues, BOM rows, and connection steps", () => {
    render(
      <BuildSheetPanels
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
        issues={[
          {
            status: "warn",
            title: "Open port",
            message: "A port needs a cap.",
          },
        ]}
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

    expect(screen.getByText("Open port")).toBeInTheDocument();
    expect(screen.getByText("1/8 in Tube")).toBeInTheDocument();
    expect(screen.getByText("1. Source -> Regulator")).toBeInTheDocument();
  });
});

