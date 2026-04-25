import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";
import { makeDebateDb } from "../test/factories";

const {
  mockUseAuth,
  mockFetchDebates,
  mockRegisterDebateAccess,
  mockStoreActiveDebateId,
  mockGetActiveDebateId,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchDebates: vi.fn(),
  mockRegisterDebateAccess: vi.fn(),
  mockStoreActiveDebateId: vi.fn(),
  mockGetActiveDebateId: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../services/supabase", () => ({
  fetchDebates: (...args: unknown[]) => mockFetchDebates(...args),
  registerDebateAccess: (...args: unknown[]) => mockRegisterDebateAccess(...args),
}));

vi.mock("../utils/storage", () => ({
  storeActiveDebateId: (...args: unknown[]) => mockStoreActiveDebateId(...args),
  getActiveDebateId: (...args: unknown[]) => mockGetActiveDebateId(...args),
}));

vi.mock("../components/layout/Header", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../components/layout/Footer", () => ({
  default: () => <div>Footer</div>,
}));

vi.mock("../components/auth/GitHubLogin", () => ({
  default: () => <div>GitHub Login</div>,
}));

vi.mock("../components/debates/DebateList", () => ({
  default: ({
    title,
    debates,
  }: {
    title: string;
    debates: Array<{ id: string; title: string }>;
  }) => (
    <section>
      <h2>{title}</h2>
      {debates.map((debate) => (
        <p key={debate.id}>{debate.title}</p>
      ))}
    </section>
  ),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockFetchDebates.mockResolvedValue([]);
    mockRegisterDebateAccess.mockResolvedValue(true);
    mockStoreActiveDebateId.mockReset();
    mockGetActiveDebateId.mockReturnValue(null);
  });

  it("shows the unauthenticated landing state without fetching debates", () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Rough Consensus")).toBeInTheDocument();
    expect(screen.getByText("GitHub Login")).toBeInTheDocument();
    expect(mockFetchDebates).not.toHaveBeenCalled();
  });

  it("fetches and groups debates for authenticated users", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "user-1",
        displayName: "Alex",
        isAdmin: false,
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockFetchDebates.mockResolvedValue([
      makeDebateDb({
        id: "ongoing-1",
        title: "Current Debate",
        current_phase: "pre",
      }),
      makeDebateDb({
        id: "scheduled-1",
        title: "Upcoming Debate",
        current_phase: "scheduled",
      }),
      makeDebateDb({
        id: "finished-1",
        title: "Past Debate",
        current_phase: "finished",
      }),
    ]);

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockFetchDebates).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Ongoing Debates")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Debates")).toBeInTheDocument();
    expect(screen.getByText("Past Debates")).toBeInTheDocument();
    expect(screen.getByText("Current Debate")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Debate")).toBeInTheDocument();
    expect(screen.getByText("Past Debate")).toBeInTheDocument();
  });
});
