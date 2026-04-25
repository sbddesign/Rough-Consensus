import { Session } from "@supabase/supabase-js";
import { CompositeTypes, Enums, Tables } from "./database.types";

export type VoteOption = "for" | "against" | "undecided";
export type OAuthProvider = "github" | "google";

type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

type KeysToCamelCase<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K] extends object
    ? KeysToCamelCase<T[K]>
    : T[K];
};

export type Vote = Tables<"votes">;

export type CastedVote = {
  preDebate: { option: VoteOption };
  postDebate: { option: VoteOption };
};

export type User = {
  id: SessionUser["id"];
  displayName: SessionUser["user_metadata"]["full_name"];
  isAdmin?: boolean;
};

export type SessionUser = Session["user"];

export type Phase = Enums<"Debate Phase">;

export type DebateDb = Tables<"debates">;

export type Debate = KeysToCamelCase<DebateDb>;

export type DbLink = CompositeTypes<"sankey_link">;

export type DbNode = CompositeTypes<"sankey_node">;

export type DbSankeyData = CompositeTypes<"debate_sankey_data">;
export type DbDebateResult = CompositeTypes<"debate_result">;

export type Tally = NonNullable<CompositeTypes<"debate_vote_counts">>;
