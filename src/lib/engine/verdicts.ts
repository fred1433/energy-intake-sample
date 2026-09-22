/** How the four decisions are named wherever they are shown. */
import type { Verdict } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  admissible: "Admissible for the operation",
  out_of_scope: "Out of scope for this operation",
  insufficient_information: "Information insufficient",
  documentary_contradiction: "Documentary contradiction",
};

/** How the answer to "may these rows be added" is shown. */
export const SEMANTICS_LABEL: Record<string, string> = {
  its_own_slice: "its own slice of the quantity",
  repeats_a_quantity_other_rows_carry: "a quantity other kept rows also carry",
  not_stated: "the publication does not say",
};
