import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebateProvider } from "./DebateProvider";
import { useDebate } from "./DebateContext";
import { makeDebateDb, makeTally, makeVote } from "../test/factories";
import type { DbDebateResult, Debate } from "../types";

const {
  mockUseAuth,
  mockFetchDebate,
  mockCastVote,
  mockUpdateDebatePhase,
  mockSubscribeToDebate,
  mockSubscribeToVoteCounts,
  mockSubscribeToSankeyData,
  mockFrom,
  mockVotesSelect,
  mockVotesEqDebateId,
  mockVotesEqUserId,
  mockVotesMaybeSingle,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchDebate: vi.fn(),
  mockCastVote: vi.fn(),
  mockUpdateDebatePhase: vi.fn(),
  mockSubscribeToDebate: vi.fn(),
  mockSubscribeToVoteCounts: vi.fn(),
  mockSubscribeToSankeyData: vi.fn(),
  mockFrom: vi.fn(),
  mockVotesSelect: vi.fn(),
  mockVotesEqDebateId: vi.fn(),
  mockVotesEqUserId: vi.fn(),
  mockVotesMaybeSingle: vi.fn(),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../services/supabase", () => ({
  fetchDebate: (...args: unknown[]) => mockFetchDebate(...args),
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("../services/voteService", () => ({
  castVote: (...args: unknown[]) => mockCastVote(...args),
  updateDebatePhase: (...args: unknown[]) => mockUpdateDebatePhase(...args),
  subscribeToDebate: (...args: unknown[]) => mockSubscribeToDebate(...args),
  subscribeToVoteCounts: (...args: unknown[]) =>
    mockSubscribeToVoteCounts(...args),
  subscribeToSankeyData: (...args: unknown[]) =>
    mockSubscribeToSankeyData(...args),
}));

let latestContext: ReturnType<typeof useDebate> | null = null;

function DebateConsumer() {
  latestContext = useDebate();

  return (
    <div>
      <div data-testid="loading">{String(latestContext.loading)}</div>
      <div data-testid="title">{latestContext.debate?.title ?? "none"}</div>
      <div data-testid="user-vote">
        {JSON.stringify(latestContext.userVote?.pre_vote ?? null)}
      </div>
      <div data-testid="pre-for">{latestContext.voteCounts.pre.for}</div>
      <div data-testid="shift-for">
        {latestContext.voteSummary?.percentShift.for ?? "none"}
      </div>
      <div data-testid="sankey">
        {latestContext.sankeyData ? "present" : "missing"}
      </div>
    </div>
  );
}

describe("DebateProvider", () => {
  beforeEach(() => {
    latestContext = null;
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "user-1",
        displayName: "Alex",
        isAdmin: false,
      },
    });
    mockFetchDebate.mockResolvedValue(
      makeDebateDb({
        id: "debate-1",
        title: "Debate One",
        current_phase: "pre",
      }),
    );
    mockCastVote.mockResolvedValue(
      makeVote({
        pre_vote: { option: "for" },
      }),
    );
    mockUpdateDebatePhase.mockResolvedValue(true);
    mockSubscribeToDebate.mockReturnValue(vi.fn());
    mockSubscribeToVoteCounts.mockReturnValue(vi.fn());
    mockSubscribeToSankeyData.mockReturnValue(vi.fn());
    mockVotesMaybeSingle.mockResolvedValue({
      data: makeVote({
        pre_vote: { option: "against" },
      }),
      error: null,
    });
    mockVotesEqUserId.mockReturnValue({
      maybeSingle: (...args: unknown[]) => mockVotesMaybeSingle(...args),
    });
    mockVotesEqDebateId.mockReturnValue({
      eq: (...args: unknown[]) => mockVotesEqUserId(...args),
    });
    mockVotesSelect.mockReturnValue({
      eq: (...args: unknown[]) => mockVotesEqDebateId(...args),
    });
    mockFrom.mockReturnValue({
      select: (...args: unknown[]) => mockVotesSelect(...args),
    });
  });

  it("hydrates debate state, derives vote summary, receives realtime updates, and cleans up subscriptions", async () => {
    let debateCallback: ((debate: Debate) => void) | undefined;
    let voteCountsCallback:
      | ((counts: ReturnType<typeof makeTally>) => void)
      | undefined;
    let sankeyCallback: ((data: DbDebateResult | null) => void) | undefined;
    const unsubscribeDebate = vi.fn();
    const unsubscribeVoteCounts = vi.fn();
    const unsubscribeSankey = vi.fn();

    mockSubscribeToDebate.mockImplementation((_debateId, callback) => {
      debateCallback = callback;
      return unsubscribeDebate;
    });
    mockSubscribeToVoteCounts.mockImplementation((_debateId, callback) => {
      voteCountsCallback = callback;
      return unsubscribeVoteCounts;
    });
    mockSubscribeToSankeyData.mockImplementation((_debateId, callback) => {
      sankeyCallback = callback;
      return unsubscribeSankey;
    });

    const { unmount } = render(
      <DebateProvider debateId="debate-1">
        <DebateConsumer />
      </DebateProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("title")).toHaveTextContent("Debate One");
    expect(screen.getByTestId("user-vote")).toHaveTextContent("against");
    expect(mockFetchDebate).toHaveBeenCalledWith("debate-1");

    voteCountsCallback?.(
      makeTally({
        pre: { for: 3, against: 1, undecided: 0 },
        post: { for: 1, against: 3, undecided: 0 },
        total_voters: 4,
        current_phase: "finished",
      }),
    );

    const sankeyData: DbDebateResult = {
      before: { pro: 3, against: 1, undecided: 0 },
      after: { pro: 1, against: 3, undecided: 0 },
      flows: {
        protopro: 1,
        protoagainst: 2,
        protoundecided: 0,
        againsttopro: 0,
        againsttoagainst: 1,
        againsttoundecided: 0,
        undecidedtopro: 0,
        undecidedtoagainst: 0,
        undecidedtoundecided: 0,
      },
    };
    sankeyCallback?.(sankeyData);
    debateCallback?.({
      ...makeDebateDb({
        id: "debate-1",
        title: "Updated Debate",
        current_phase: "post",
      }),
      currentPhase: "post",
      startTime: "2026-04-24T19:00:00.000Z",
      endTime: "2026-04-24T20:00:00.000Z",
      createdBy: "user-1",
      createdAt: "2026-04-24T00:00:00.000Z",
      proDescription: "Pro position",
      conDescription: "Con position",
      isDeleted: false,
    } as Debate);

    await waitFor(() => {
      expect(screen.getByTestId("pre-for")).toHaveTextContent("3");
      expect(screen.getByTestId("shift-for")).toHaveTextContent("-50");
      expect(screen.getByTestId("sankey")).toHaveTextContent("present");
      expect(screen.getByTestId("title")).toHaveTextContent("Updated Debate");
    });

    unmount();

    expect(unsubscribeDebate).toHaveBeenCalled();
    expect(unsubscribeVoteCounts).toHaveBeenCalledTimes(1);
    expect(unsubscribeSankey).toHaveBeenCalledTimes(1);
  });

  it("passes the current vote state into castVote and stores the returned vote", async () => {
    render(
      <DebateProvider debateId="debate-1">
        <DebateConsumer />
      </DebateProvider>,
    );

    await waitFor(() => {
      expect(latestContext?.debate?.title).toBe("Debate One");
    });

    await latestContext?.handleVote("for");

    expect(mockCastVote).toHaveBeenCalledWith(
      expect.objectContaining({
        pre_vote: { option: "against" },
      }),
      "debate-1",
      "user-1",
      "pre",
      "for",
    );

    await waitFor(() => {
      expect(latestContext?.userVote?.pre_vote).toEqual({ option: "for" });
    });
  });

  it("rejects voting outside the pre/post phases and forwards phase changes", async () => {
    mockFetchDebate.mockResolvedValue(
      makeDebateDb({
        id: "debate-1",
        title: "Closed Debate",
        current_phase: "ongoing",
      }),
    );

    render(
      <DebateProvider debateId="debate-1">
        <DebateConsumer />
      </DebateProvider>,
    );

    await waitFor(() => {
      expect(latestContext?.debate?.title).toBe("Closed Debate");
    });

    await expect(latestContext?.handleVote("for")).rejects.toThrow(
      "Voting is currently closed.",
    );

    await latestContext?.changePhase("finished");

    expect(mockCastVote).not.toHaveBeenCalled();
    expect(mockUpdateDebatePhase).toHaveBeenCalledWith("debate-1", "finished");
  });
});
