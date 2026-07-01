import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ScopeLandingPage } from "./ScopeLandingPage";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("ScopeLandingPage", () => {
  beforeEach(() => navigate.mockClear());

  it("routes users to Lab or Field scope", () => {
    render(
      <MemoryRouter>
        <ScopeLandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Choose Scope/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Lab/i }));
    expect(navigate).toHaveBeenCalledWith("/lab/assemblies");
    fireEvent.click(screen.getByRole("button", { name: /Field/i }));
    expect(navigate).toHaveBeenCalledWith("/field/rig-ups");
  });
});
