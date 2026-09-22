/** How the four decisions are named wherever they are shown. */
import type { Verdict } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  admissible: "Admissible for the operation",
  out_of_scope: "Out of scope for this operation",
  insufficient_information: "Information insufficient",
  magnitude_check_failed: "Magnitude check failed",
};

/** The same four, short enough for a narrow screen. */
export const VERDICT_SHORT: Record<Verdict, string> = {
  admissible: "Admissible",
  out_of_scope: "Out of scope",
  insufficient_information: "Insufficient",
  magnitude_check_failed: "Magnitude check failed",
};

/** What each one delivers. Kept out of the main path of the page, and used where it helps. */
export const VERDICT_MEANING: Record<Verdict, string> = {
  admissible:
    "Every documented condition the program checks is met. It delivers the value, its calculation and where it came from.",
  out_of_scope:
    "What the publication carries is not what was asked for. It delivers the difference, and the operation it did not run.",
  insufficient_information:
    "A necessary condition is not established. It delivers the first one that blocked, and the question that settles it.",
  magnitude_check_failed:
    "The total came out outside the band this program accepts. It delivers the total, the band and where the band comes from, and attributes the anomaly to nothing.",
};

/** How the answer to "may these rows be added" is shown. */
export const SEMANTICS_LABEL: Record<string, string> = {
  its_own_slice: "its own slice of the quantity",
  repeats_a_quantity_other_rows_carry: "a quantity other kept rows also carry",
  not_stated: "the publication does not say",
};
