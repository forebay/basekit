import type { Impact } from "./activity-impact.js";

export type { Impact };

// The activity model is DECLARED in Java, in this repo's own `contracts` module, and generated
// into `./generated/contracts.ts`. These are the names this package publishes, so they are
// ALIASES of the generated declarations rather than a second set: a hand-copied type checks out on
// the day it is written and silently diverges afterwards, which is exactly what this file had done.
// A name that needs a field the Java lacks is fixed in the Java, never by re-declaring it here.
export type {
  ActivitySpec,
  ActivityRecord,
  ActivityQuery,
  ActivityActor as Actor,
  ActivitySubject as Subject,
  ActivityCauseKind as CauseKind,
  ActivityOrigin as Origin,
  ActivityTarget as Target,
  ActivityCause as Cause,
  ActivityTrace as Trace,
  ActivityValueChange as ValueChange,
  ActivityOutcome as Outcome,
} from "./generated/contracts.js";

/** What retention is acting on in one home. */
export interface ActivityHomeStats {
  /** Absolute path of the home measured. */
  home: string;
  /** Total size of its retained log files. */
  bytes: number;
  /** How many log files it is holding. */
  segments: number;
  /** The oldest event still on disk, in epoch milliseconds. */
  oldestTs?: number;
}

/**
 * What retention is acting on across every home asked about.
 *
 * @remarks
 * Deliberately no record count: that would mean reading every byte of an unbounded history to
 * render a settings screen.
 */
export interface ActivityStats {
  /** The figures for each home measured. */
  homes: ActivityHomeStats[];
  /** Total size across every home. */
  bytes: number;
  /** How many log files across every home. */
  segments: number;
  /** The oldest event still on disk anywhere, in epoch milliseconds. */
  oldestTs?: number;
}
