import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FieldRigUpsPage } from "./FieldRigUpsPage";

describe("FieldRigUpsPage", () => {
  it("renders the field rig-up list shell", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FieldRigUpsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: /Field Rig-Ups/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Field Rig-Up/i })).toBeInTheDocument();
  });
});
