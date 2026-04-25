import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DebatePageContent from "./DebatePageContent";
import { makeDebate, makeTally, makeVote } from "../../test/factories";

const { mockUseAuth, mockUseDebate } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseDebate: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../context/DebateContext", () => ({
  useDebate: () => mockUseDebate(),
}));

vi.mock("../layout/Header", () => ({
  default: ({ title, debateTitle }: { title: string; debateTitle?: string }) => (
    <div>
      <span>{title}</span>
      <span>{debateTitle}</span>
    </div>
  ),
}));

vi.mock("../layout/Footer", () => ({
  default: () => <div>Footer</div>,
}));

vi.mock("./DebateInfoPanel", () => ({
  default: () => <div>Debate Info</div>,
}));

vi.mock("../voting/VotingSection", () => ({
  default: ({ phase }: { phase: string }) => <div>{phase} voting section</div>,
}));

vi.mock("../results/ResultsPanel", () => ({
  default: () => <div>Results Panel</div>,
}));

describe("DebatePageContent", () => {
  beforeEach(() => {
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
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "pre", title: "Current Debate" }),
      loading: false,
      userVote: null,
      voteCounts: makeTally(),
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });
  });

  it("redirects unauthenticated users away from active debates", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={["/debate/debate-1"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/debate/:debateId"
            element={<DebatePageContent debateId="debate-1" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.queryByText("Results Panel")).not.toBeInTheDocument();
  });

  it("shows results without voting for finished debates when the user has not voted", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "finished", title: "Past Debate" }),
      loading: false,
      userVote: null,
      voteCounts: makeTally({ current_phase: "finished" }),
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <DebatePageContent debateId="debate-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Past Debate")).toBeInTheDocument();
    expect(screen.getByText("Results Panel")).toBeInTheDocument();
    expect(screen.queryByText("pre voting section")).not.toBeInTheDocument();
    expect(screen.queryByText("post voting section")).not.toBeInTheDocument();
  });

  it("shows both voting panels when the debate is accessible and voting is allowed", () => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "post", title: "Live Debate" }),
      loading: false,
      userVote: makeVote({
        pre_vote: { option: "for" },
      }),
      voteCounts: makeTally({ current_phase: "post" }),
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <DebatePageContent debateId="debate-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("pre voting section")).toBeInTheDocument();
    expect(screen.getByText("post voting section")).toBeInTheDocument();
    expect(screen.getByText("Results Panel")).toBeInTheDocument();
  });
});
