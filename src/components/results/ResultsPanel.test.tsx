import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResultsPanel from "./ResultsPanel";
import { makeDebate, makeTally } from "../../test/factories";
import type { DbDebateResult } from "../../types";

const { mockUseDebate } = vi.hoisted(() => ({
  mockUseDebate: vi.fn(),
}));

vi.mock("../../context/DebateContext", () => ({
  useDebate: () => mockUseDebate(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("./SankeyDiagram/debate-flow", () => ({
  DebateFlow: () => <div>Sankey Diagram</div>,
}));

describe("ResultsPanel", () => {
  beforeEach(() => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "pre" }),
      loading: false,
      userVote: null,
      voteCounts: makeTally(),
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });
  });

  it("shows a placeholder until the debate is finished", () => {
    render(<ResultsPanel />);

    expect(
      screen.getByText("Results will appear here once the debate is finished."),
    ).toBeInTheDocument();
  });

  it("shows the analysis panels and sankey fallback after a debate finishes", () => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "finished" }),
      loading: false,
      userVote: null,
      voteCounts: makeTally({
        pre: { for: 5, against: 3, undecided: 2 },
        post: { for: 6, against: 4, undecided: 0 },
        total_voters: 10,
        current_phase: "finished",
      }),
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: {
        pre: { for: 5, against: 3, undecided: 2, total: 10 },
        post: { for: 6, against: 4, undecided: 0, total: 10 },
        percentShift: { for: 10, against: 10, undecided: -20 },
      },
    });

    render(<ResultsPanel />);

    expect(screen.getByText("Results Analysis")).toBeInTheDocument();
    expect(screen.getByText("Pre-Debate")).toBeInTheDocument();
    expect(screen.getByText("Post-Debate")).toBeInTheDocument();
    expect(screen.getByText("Opinion Shift")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The Sankey diagram will appear here once users have voted in both phases.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the sankey diagram when result flow data exists", () => {
    const sankeyData: DbDebateResult = {
      before: { pro: 5, against: 3, undecided: 2 },
      after: { pro: 6, against: 4, undecided: 0 },
      flows: {
        protopro: 4,
        protoagainst: 1,
        protoundecided: 0,
        againsttopro: 1,
        againsttoagainst: 2,
        againsttoundecided: 0,
        undecidedtopro: 1,
        undecidedtoagainst: 1,
        undecidedtoundecided: 0,
      },
    };

    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "finished" }),
      loading: false,
      userVote: null,
      voteCounts: makeTally({ current_phase: "finished" }),
      sankeyData,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: {
        pre: { for: 5, against: 3, undecided: 2, total: 10 },
        post: { for: 6, against: 4, undecided: 0, total: 10 },
        percentShift: { for: 10, against: 10, undecided: -20 },
      },
    });

    render(<ResultsPanel />);

    expect(screen.getByText("Sankey Diagram")).toBeInTheDocument();
  });
});
