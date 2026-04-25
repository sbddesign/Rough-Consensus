import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./AdminPage";
import { makeDebateDb } from "../test/factories";

const {
  mockUseAuth,
  mockFrom,
  mockDebatesSelect,
  mockDebatesOrder,
  mockDebatesInsert,
  mockInsertSelect,
  mockInsertSingle,
  mockDebatesUpdate,
  mockUpdateEq,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFrom: vi.fn(),
  mockDebatesSelect: vi.fn(),
  mockDebatesOrder: vi.fn(),
  mockDebatesInsert: vi.fn(),
  mockInsertSelect: vi.fn(),
  mockInsertSingle: vi.fn(),
  mockDebatesUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../services/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("../components/layout/Header", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../components/layout/Footer", () => ({
  default: () => <div>Footer</div>,
}));

vi.mock("../components/admin/AdminPhaseController", () => ({
  default: ({
    debateId,
    onUpdatePhase,
  }: {
    debateId: string;
    onUpdatePhase: (debateId: string, phase: "finished") => Promise<void>;
  }) => (
    <button onClick={() => void onUpdatePhase(debateId, "finished")}>
      finish debate
    </button>
  ),
}));

describe("AdminPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "admin-1",
        displayName: "Admin",
        isAdmin: true,
      },
      loading: false,
    });

    mockDebatesOrder.mockResolvedValue({
      data: [
        makeDebateDb({
          id: "debate-1",
          title: "Existing Debate",
          current_phase: "pre",
        }),
      ],
      error: null,
    });
    mockDebatesSelect.mockReturnValue({
      order: (...args: unknown[]) => mockDebatesOrder(...args),
    });
    mockInsertSingle.mockResolvedValue({
      data: makeDebateDb({
        id: "debate-2",
        title: "New Debate",
        description: "Created from test",
        current_phase: "scheduled",
        created_by: "admin-1",
      }),
      error: null,
    });
    mockInsertSelect.mockReturnValue({
      single: (...args: unknown[]) => mockInsertSingle(...args),
    });
    mockDebatesInsert.mockReturnValue({
      select: (...args: unknown[]) => mockInsertSelect(...args),
    });
    mockUpdateEq.mockResolvedValue({
      error: null,
    });
    mockDebatesUpdate.mockReturnValue({
      eq: (...args: unknown[]) => mockUpdateEq(...args),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table !== "debates") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (...args: unknown[]) => mockDebatesSelect(...args),
        insert: (...args: unknown[]) => mockDebatesInsert(...args),
        update: (...args: unknown[]) => mockDebatesUpdate(...args),
      };
    });
  });

  it("redirects non-admin users away from the admin page", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "user-1",
        displayName: "Alex",
        isAdmin: false,
      },
      loading: false,
    });

    render(
      <MemoryRouter
        initialEntries={["/admin"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });

  it("creates a new debate from the admin form", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Debate")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Create New Debate" }),
    );
    await user.type(screen.getByLabelText("Title"), "New Debate");
    await user.type(
      screen.getByLabelText("Description"),
      "Created from test",
    );
    await user.click(screen.getByRole("button", { name: "Create Debate" }));

    expect(mockDebatesInsert).toHaveBeenCalledWith([
      {
        title: "New Debate",
        description: "Created from test",
        current_phase: "scheduled",
        created_by: "admin-1",
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText("New Debate")).toBeInTheDocument();
    });
  });

  it("updates debate phase from the admin controls", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Debate")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "finish debate" }));

    await waitFor(() => {
      expect(mockDebatesUpdate).toHaveBeenCalledWith({
        current_phase: "finished",
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "debate-1");
      expect(screen.getByText("Finished")).toBeInTheDocument();
    });
  });
});
