/**
 * The vocabulary of one operation.
 *
 * The operation, stated once and never restated by any other file:
 * produce, for a given city and year, the annual electricity consumption of the
 * territory, expressed in GWh, from an open municipal publication.
 *
 * Nothing here names a city, a column or a publisher. The engine is handed a
 * table, a documentation text, and a correspondence proposal; it executes what
 * it can check and refuses the rest by naming the condition.
 */

/** The energy units this program is willing to convert between. */
export type Unit = "kWh" | "MWh" | "GWh" | "TWh" | "GJ" | "TJ";

/** What the model may say about where the unit comes from. */
export type UnitEvidenceKind = "column" | "documentation" | "header_label" | "not_declared";

/**
 * What a row stands for in time. The distinction is the one that decides whether
 * rows may be added together at all.
 */
export type RowSemantics =
  /** The row carries its own slice of the quantity, and no other kept row carries that slice again. Rows add up. */
  | "its_own_slice"
  /** The row repeats a quantity other kept rows also carry, so adding them counts it more than once. */
  | "repeats_a_quantity_other_rows_carry"
  /** The publication does not say. */
  | "not_stated";

export interface Dialect {
  delimiter: string;
  decimalSeparator: "." | ",";
  /** Digit grouping in the published numbers, when there is one. */
  thousandsSeparator: "." | "," | " " | "none";
  encoding: "utf-8" | "utf-8-bom" | "iso-8859-1" | "windows-1252";
}

export interface Citation {
  /** Copied from the material, character for character. The code looks for it there. */
  quote: string;
  where: "file" | "documentation";
  /** Why this passage matters for the correspondence. */
  supports: string;
}

/**
 * What the model proposes. Every field here is a claim, not a fact: the engine
 * checks each one against the material before it acts on it.
 */
export interface Proposal {
  dialect: Dialect;
  /** Rows kept for the operation, by exact match on a column value. */
  rowFilters: { column: string; equals: string }[];
  /** The columns carrying the quantity the operation asks for. Several when the publication splits it into parts. */
  valueColumns: string[];
  /** The column that tells which period a row is filed under, when there is one. */
  periodColumn: string | null;
  declaredUnit: Unit | "not_declared";
  unitEvidence: { kind: UnitEvidenceKind; quote: string | null };
  /** Set when the file carries its unit in a column of its own; the code then reads it directly. */
  unitColumn: string | null;
  rowSemantics: RowSemantics;
  rowSemanticsEvidence: { quote: string | null };
  /** What the retained rows cover, in the model's own words. */
  perimeter: string;
  /** The decision the model does not take, in its own words. */
  openQuestion: string;
  citations: Citation[];
}

export type Verdict =
  /** The documented conditions this program checks are met. */
  | "admissible"
  /** A known difference forbids this precise use. */
  | "out_of_scope"
  /** A necessary condition is not established. */
  | "insufficient_information"
  /** Two published statements about the same object cannot both hold. */
  | "documentary_contradiction";

export interface Check {
  id: string;
  label: string;
  /** Who did this step. The whole point of the trace. */
  by: "model" | "code" | "human";
  outcome: "pass" | "fail" | "not_applicable";
  detail: string;
}

export interface Passage {
  quote: string;
  where: "file" | "documentation";
  located: boolean;
  supports: string;
}

export interface Execution {
  verdict: Verdict;
  /** One sentence about the operation. Never about the city, never about the publisher. */
  statement: string;
  /** The condition that would have to be established, when there is one. */
  missingCondition: string | null;
  /** For a documentary contradiction: the passages that cannot both hold, verbatim. */
  incompatiblePassages: Passage[];
  checks: Check[];
  passages: Passage[];
  rowsRead: number;
  rowsRetained: number;
  /** The total in the publication's own unit, before any conversion. */
  rawTotal: number | null;
  /** The conversions the code ran, each shown with its factor. */
  conversion: {
    fromUnit: Unit;
    toUnit: Unit;
    factor: number;
    input: number;
    output: number;
    statement: string;
    /** The same quantity in joules, so the factor can be checked without running anything. */
    joules: { unit: Unit; factor: number; output: number; statement: string };
  } | null;
  valueGwh: number | null;
  valueGj: number | null;
  /** The decision this program did not take in anyone's place. */
  openQuestion: string;
}
