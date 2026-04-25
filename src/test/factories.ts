import type { Debate, DebateDb, Tally, Vote } from "../types";

export function makeDebate(overrides: Partial<Debate> = {}): Debate {
  return {
    id: "debate-1",
    title: "Should the motion pass?",
    description: "A test debate description.",
    currentPhase: "scheduled",
    startTime: "2026-04-24T19:00:00.000Z",
    endTime: "2026-04-24T20:00:00.000Z",
    createdBy: "user-1",
    createdAt: "2026-04-20T00:00:00.000Z",
    motion: "This house would write tests first.",
    proDescription: "Pro position",
    conDescription: "Con position",
    isDeleted: false,
    ...overrides,
  };
}

export function makeDebateDb(overrides: Partial<DebateDb> = {}): DebateDb {
  return {
    id: "debate-1",
    title: "Should the motion pass?",
    description: "A test debate description.",
    current_phase: "scheduled",
    start_time: "2026-04-24T19:00:00.000Z",
    end_time: "2026-04-24T20:00:00.000Z",
    created_by: "user-1",
    created_at: "2026-04-20T00:00:00.000Z",
    motion: "This house would write tests first.",
    pro_description: "Pro position",
    con_description: "Con position",
    is_deleted: false,
    ...overrides,
  };
}

export function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: "vote-1",
    created_at: "2026-04-24T19:05:00.000Z",
    debate_id: "debate-1",
    user_id: "user-1",
    pre_vote: null,
    post_vote: null,
    ...overrides,
  };
}

export function makeTally(overrides: Partial<Tally> = {}): Tally {
  return {
    pre: { for: 0, against: 0, undecided: 0 },
    post: { for: 0, against: 0, undecided: 0 },
    total_voters: 0,
    current_phase: "scheduled",
    ...overrides,
  };
}
