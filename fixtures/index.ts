/**
 * Golden decision-envelope fixtures.
 *
 * Three shape examples covering common M-of-N quorum trajectories:
 *
 *   - `oneOfOne`        — single-signer, satisfied immediately (low-risk path)
 *   - `twoOfThreePending` — partial quorum; one more signer required
 *   - `threeOfFiveSatisfied` — multi-signer, satisfied; mixed cryptosuites
 *
 * Import them in your tests, or use them as wire-format references when
 * implementing a decision-envelope producer.
 *
 * Fixture signatures use placeholder bytes — they do NOT verify against
 * real keys. Treat them as shape examples, not as proof artifacts.
 */

import oneOfOne from "./decision-1-of-1.json" with { type: "json" };
import twoOfThreePending from "./decision-2-of-3-pending.json" with { type: "json" };
import threeOfFiveSatisfied from "./decision-3-of-5-satisfied.json" with { type: "json" };

import type { DecisionEnvelope } from "../src/types";

export const decisionFixtures = {
  /** Single-signer decision, quorum satisfied at 1/1. */
  oneOfOne: oneOfOne as unknown as DecisionEnvelope,
  /** Two distinct signers against a 3-of-3 policy — pending. */
  twoOfThreePending: twoOfThreePending as unknown as DecisionEnvelope,
  /** Three distinct signers against a 3-of-5 policy — satisfied. */
  threeOfFiveSatisfied: threeOfFiveSatisfied as unknown as DecisionEnvelope,
} as const;

export type DecisionFixtureKey = keyof typeof decisionFixtures;
