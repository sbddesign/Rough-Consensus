import { fetchDebate, supabase } from "../services/supabase";
import React, { useState, useEffect } from "react";
import {
  subscribeToDebate,
  updateDebatePhase,
  castVote,
  subscribeToVoteCounts,
  subscribeToSankeyData,
} from "../services/voteService";
import {
  Debate,
  VoteOption,
  Tally,
  Phase,
  Vote,
  DbDebateResult,
} from "../types";
import { useAuth } from "./AuthContext";
import { calculatePercentage, coerceDebateFromDb } from "../lib/utils";
import { DebateContext } from "./DebateContext";

export type DebateContextType = {
  debate: Debate | null;
  loading: boolean;
  userVote: Vote | null;
  voteCounts: Tally;
  sankeyData: DbDebateResult | null;
  handleVote: (option: VoteOption) => Promise<void>;
  changePhase: (phase: Phase) => Promise<void>;
  voteSummary: VoteSummary | null;
};

const defaultVoteCounts = {
  pre: { for: 0, against: 0, undecided: 0 },
  post: { for: 0, against: 0, undecided: 0 },
  total_voters: 0,
  current_phase: null,
} satisfies Tally;

type VoteSummary = {
  pre: {
    for: number;
    against: number;
    undecided: number;
    total: number;
  };
  post: {
    for: number;
    against: number;
    undecided: number;
    total: number;
  };
  percentShift: {
    for: number;
    against: number;
    undecided: number;
  };
};

const calculateVoteSummary = (counts: Tally): VoteSummary | null => {
  if (!counts.pre || !counts.post) return null;
  const votes = {
    pre: {
      for: counts.pre?.for ?? 0,
      against: counts.pre?.against ?? 0,
      undecided: counts.pre?.undecided ?? 0,
    },
    post: {
      for: counts.post?.for ?? 0,
      against: counts.post?.against ?? 0,
      undecided: counts.post?.undecided ?? 0,
    },
  };
  const totalVotes = {
    pre: votes.pre.for + votes.pre.against + votes.pre.undecided,
    post: votes.post.for + votes.post.against + votes.post.undecided,
  };
  return {
    pre: {
      ...votes.pre,
      total: totalVotes.pre,
    },
    post: {
      ...votes.post,
      total: totalVotes.post,
    },
    percentShift: {
      for:
        calculatePercentage(votes.post.for, totalVotes.post) -
        calculatePercentage(votes.pre.for, totalVotes.pre),
      against:
        calculatePercentage(votes.post.against, totalVotes.post) -
        calculatePercentage(votes.pre.against, totalVotes.pre),
      undecided:
        calculatePercentage(votes.post.undecided, totalVotes.post) -
        calculatePercentage(votes.pre.undecided, totalVotes.pre),
    },
  };
};

export const DebateProvider: React.FC<{
  children: React.ReactNode;
  debateId: string;
}> = ({ children, debateId }) => {
  const { currentUser } = useAuth();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [sankeyData, setSankeyData] = useState<DbDebateResult | null>(null);
  const [voteCounts, setVoteCounts] = useState<Tally>(defaultVoteCounts);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);

  useEffect(() => {
    if (!debateId) return;

    const fetch = async () => {
      try {
        const debateData = await fetchDebate(debateId);
        const mappedDebate = coerceDebateFromDb(debateData);
        setDebate(mappedDebate);
      } catch (err) {
        console.error("Error fetching debate:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();

    const unsubscribe = subscribeToDebate(debateId, (debateData) => {
      setDebate({
        ...debate,
        ...debateData
      })
    ;
      setLoading(false);
    });

    return () => unsubscribe();
  }, [debateId, debate]);

  // Subscribe to vote counts (aggregated on server)
  useEffect(() => {
    if (!debateId) return;

    const unsubscribe = subscribeToVoteCounts(debateId, (counts) => {
      setVoteCounts(counts);
      setVoteSummary(calculateVoteSummary(counts));
    });

    return () => unsubscribe();
  }, [debateId]);

  // Subscribe to Sankey data (aggregated on server)
  useEffect(() => {
    if (!debateId) return;

    const unsubscribe = subscribeToSankeyData(debateId, (data) => {
      if (data) {
        setSankeyData(data);
      }
    });

    return () => unsubscribe();
  }, [debateId]);

  // Subscribe to user's own vote (for personal feedback)
  useEffect(() => {
    if (!debateId || !currentUser) return;

    // Initial fetch of user's vote
    const fetchUserVote = async () => {
      try {
        const { data, error } = await supabase
          .from("votes")
          .select("*")
          .eq("debate_id", debateId)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (!error && data) {
          setUserVote(data);
        }
      } catch (error) {
        console.error("Error fetching user vote:", error);
      }
    };

    fetchUserVote();
  }, [debateId, currentUser]);

  // Handle voting
  const handleVote = async (option: VoteOption) => {
    if (!currentUser || !debate) return;

    if (debate.currentPhase !== "pre" && debate.currentPhase !== "post") {
      console.error("Voting is currently closed. Phase:", debate.currentPhase);
      throw new Error("Voting is currently closed.");
    }

    try {
      const vote = await castVote(
        userVote,
        debateId,
        currentUser.id,
        debate.currentPhase,
        option
      );
      if (vote) setUserVote(vote);
    } catch (error) {
      console.error("Error handling vote:", error);
      throw error;
    }
  };

  // Change debate phase
  const changePhase = async (phase: Phase) => {
    if (!debate) return;

    try {
      await updateDebatePhase(debateId, phase);
    } catch (error) {
      console.error("Error changing phase:", error);
      throw error;
    }
  };

  const value = {
    debate,
    loading,
    userVote,
    voteCounts,
    sankeyData,
    handleVote,
    changePhase,
    voteSummary,
  };

  return (
    <DebateContext.Provider value={value}>{children}</DebateContext.Provider>
  );
};
