import { describe, expect, it } from "vitest";
import {
  calculatePercentage,
  coerceDebateFromDb,
  coerceDebateListFromDb,
  getPhaseDisplay,
} from "./utils";
import { makeDebateDb } from "../test/factories";

describe("utils", () => {
  it("filters deleted debates and coerces database fields to app fields", () => {
    const visibleDebate = makeDebateDb({
      id: "visible-debate",
      current_phase: "pre",
    });
    const deletedDebate = makeDebateDb({
      id: "deleted-debate",
      is_deleted: true,
    });

    const debates = coerceDebateListFromDb([visibleDebate, deletedDebate]);

    expect(debates).toEqual([
      {
        id: "visible-debate",
        title: visibleDebate.title,
        description: visibleDebate.description,
        currentPhase: "pre",
        startTime: visibleDebate.start_time,
        endTime: visibleDebate.end_time,
        createdBy: visibleDebate.created_by,
        createdAt: visibleDebate.created_at,
        motion: visibleDebate.motion,
        proDescription: visibleDebate.pro_description,
        conDescription: visibleDebate.con_description,
        isDeleted: false,
      },
    ]);
  });

  it("coerces a single database debate", () => {
    const debateDb = makeDebateDb({
      id: "debate-42",
      current_phase: "finished",
      description: null,
    });

    expect(coerceDebateFromDb(debateDb)).toEqual({
      id: "debate-42",
      title: debateDb.title,
      description: null,
      currentPhase: "finished",
      startTime: debateDb.start_time,
      endTime: debateDb.end_time,
      createdBy: debateDb.created_by,
      createdAt: debateDb.created_at,
      motion: debateDb.motion,
      proDescription: debateDb.pro_description,
      conDescription: debateDb.con_description,
      isDeleted: false,
    });
  });

  it("returns readable labels for each debate phase", () => {
    expect(getPhaseDisplay("scheduled")).toBe("Scheduled");
    expect(getPhaseDisplay("pre")).toBe("Pre-Debate");
    expect(getPhaseDisplay("ongoing")).toBe("Ongoing");
    expect(getPhaseDisplay("post")).toBe("Post-Debate");
    expect(getPhaseDisplay("finished")).toBe("Finished");
    expect(getPhaseDisplay(null)).toBe("Unknown");
  });

  it("calculates rounded percentages and handles zero totals", () => {
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});
