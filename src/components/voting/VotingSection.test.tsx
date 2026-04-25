import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VotingSection from "./VotingSection";
import { makeDebate, makeVote } from "../../test/factories";

const { mockUseDebate } = vi.hoisted(() => ({
  mockUseDebate: vi.fn(),
}));

vi.mock("../../context/DebateContext", () => ({
  useDebate: () => mockUseDebate(),
}));

describe("VotingSection", () => {
  beforeEach(() => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "pre" }),
      loading: false,
      userVote: null,
      voteCounts: null,
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });
  });

  it("allows pre-debate voting during the pre phase", async () => {
    const handleVote = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "pre" }),
      loading: false,
      userVote: null,
      voteCounts: null,
      sankeyData: null,
      handleVote,
      changePhase: vi.fn(),
      voteSummary: null,
    });

    render(<VotingSection phase="pre" />);

    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    expect(handleVote).toHaveBeenCalledWith("for");
  });

  it("blocks post-debate voting when the user skipped the pre vote", () => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "post" }),
      loading: false,
      userVote: null,
      voteCounts: null,
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });

    render(<VotingSection phase="post" />);

    expect(
      screen.getByText(
        "You did not vote in the pre-debate phase, so you cannot vote in the post-debate phase.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Select" })[0]).toBeDisabled();
  });

  it("shows vote confirmation when the active phase already has a selected vote", () => {
    mockUseDebate.mockReturnValue({
      debate: makeDebate({ currentPhase: "post" }),
      loading: false,
      userVote: makeVote({
        pre_vote: { option: "for" },
        post_vote: { option: "against" },
      }),
      voteCounts: null,
      sankeyData: null,
      handleVote: vi.fn(),
      changePhase: vi.fn(),
      voteSummary: null,
    });

    render(<VotingSection phase="post" />);

    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your vote has been recorded. You can change it at any time during this phase.",
      ),
    ).toBeInTheDocument();
  });
});
