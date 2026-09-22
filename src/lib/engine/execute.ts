/**
 * The code half of the chain.
 *
 * The model proposes a correspondence. This file acts on the parts of it that
 * can be checked against the material, and refuses the rest by naming the
 * condition that is missing. It never repairs a proposal and never guesses a
 * value that was not published.
 *
 * Three things are deliberately not done here. No result is compared with
 * another city's. No publication is scored. No arbitration is invented between
 * two published statements that cannot both hold: both are shown and the
 * operation stops.
 */
import { BAND, CROSS_CHECK_TOLERANCE_GWH, TARGET_UNIT } from "./operation";
import { parse, parseNumber, type Table } from "./table";
import { convert, factor, isUnit, statement as unitStatement } from "./units";
import type { Check, Execution, Passage, Proposal, Unit, Verdict } from "./types";

export interface Material {
  /** The published file, decoded under the proposed dialect. */
  fileText: string;
  /** What the publisher documents beside the file, copied verbatim. */
  documentation: string;
  /**
   * The publisher's own sentence saying what the table describes. Only used
   * when two published statements turn out to be incompatible, so that both
   * can be shown side by side.
   */
  objectPassage: { quote: string; where: "file" | "documentation" };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function locate(quote: string | null, where: "file" | "documentation", material: Material): boolean {
  if (!quote) return false;
  const hay = norm(where === "file" ? material.fileText : material.documentation);
  return hay.includes(norm(quote));
}

/** Looks in both, because a passage is sometimes printed in the file and repeated in the notes. */
function locateAnywhere(quote: string | null, material: Material): boolean {
  return locate(quote, "file", material) || locate(quote, "documentation", material);
}

interface Outcome {
  verdict: Verdict;
  statement: string;
  missingCondition?: string | null;
  incompatiblePassages?: Passage[];
}

export function execute(proposal: Proposal, material: Material): Execution {
  const checks: Check[] = [];
  const add = (c: Check) => { checks.push(c); return c; };

  // ---- link 2, recorded as such: everything above this line came from the model.
  add({
    id: "correspondence_proposed",
    label: "Correspondence proposed",
    by: "model",
    outcome: "pass",
    detail: `Value read from ${proposal.valueColumns.map((c) => `"${c}"`).join(" + ")}, rows kept by ${
      proposal.rowFilters.map((f) => `${f.column} = ${f.equals}`).join(", ") || "no filter"
    }. Perimeter, in the model's words: ${proposal.perimeter}`,
  });

  // ---- link 3, the code.
  const passages: Passage[] = proposal.citations.map((c) => ({
    quote: c.quote,
    where: c.where,
    located: locate(c.quote, c.where, material),
    supports: c.supports,
  }));
  const missing = passages.filter((p) => !p.located);
  add({
    id: "passages_located",
    label: "Cited passages found in the material",
    by: "code",
    outcome: missing.length === 0 ? "pass" : "fail",
    detail:
      missing.length === 0
        ? `${passages.length} of ${passages.length} passages found, character for character, in the file or in the documentation kept in this repository.`
        : `${passages.length - missing.length} of ${passages.length} found. Not found: ${missing
            .map((p) => `"${p.quote.slice(0, 80)}"`)
            .join("; ")}. A passage that is not in the material supports nothing here.`,
  });

  const table = parse(material.fileText, proposal.dialect.delimiter);
  const named = [...proposal.valueColumns, ...proposal.rowFilters.map((f) => f.column)];
  if (proposal.unitColumn) named.push(proposal.unitColumn);
  const absent = named.filter((c) => !table.header.includes(c));
  add({
    id: "columns_exist",
    label: "Named columns exist in the file",
    by: "code",
    outcome: absent.length === 0 ? "pass" : "fail",
    detail:
      absent.length === 0
        ? `${named.length} named columns found among the ${table.header.length} the file publishes.`
        : `Absent from the header: ${absent.map((c) => `"${c}"`).join(", ")}.`,
  });
  if (absent.length > 0) {
    return finish(proposal, checks, passages, 0, 0, null, null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: a column the correspondence relies on is not in the published file.",
      missingCondition: `A column named ${absent.map((c) => `"${c}"`).join(", ")} in the published file.`,
    });
  }

  const index = (name: string) => table.header.indexOf(name);
  const missingValues = proposal.rowFilters.filter(
    (f) => !table.rows.some((r) => (r[index(f.column)] ?? "").trim() === f.equals),
  );
  add({
    id: "filter_values_present",
    label: "Each filter value occurs in its column",
    by: "code",
    outcome: missingValues.length === 0 ? "pass" : "fail",
    detail:
      missingValues.length === 0
        ? proposal.rowFilters.map((f) => `${f.column} = ${f.equals}`).join("; ") || "No filter proposed."
        : `Never found in the file: ${missingValues.map((f) => `${f.column} = ${f.equals}`).join("; ")}.`,
  });
  if (missingValues.length > 0) {
    return finish(proposal, checks, passages, table.rows.length, 0, null, null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: a value the correspondence filters on never occurs in the published file.",
      missingCondition: `A row where ${missingValues.map((f) => `${f.column} = ${f.equals}`).join(" and ")}.`,
    });
  }

  const retained = table.rows.filter((r) =>
    proposal.rowFilters.every((f) => (r[index(f.column)] ?? "").trim() === f.equals),
  );
  const parsed = retained.map((r) =>
    proposal.valueColumns.map((c) => parseNumber(r[index(c)] ?? "", proposal.dialect)),
  );
  const cells = parsed.flat();
  const unreadable = cells.filter((v) => v === null).length;
  const readable = cells.length - unreadable;
  const share = cells.length === 0 ? 0 : readable / cells.length;
  add({
    id: "values_are_numbers",
    label: "The value column reads as numbers under the proposed dialect",
    by: "code",
    outcome: retained.length > 0 && share >= 0.99 ? "pass" : "fail",
    detail:
      retained.length === 0
        ? "No row is kept by the proposed filters."
        : `${readable} of ${cells.length} cells read as numbers with separator "${proposal.dialect.delimiter}", decimal mark "${proposal.dialect.decimalSeparator}", digit grouping "${proposal.dialect.thousandsSeparator}".`,
  });
  if (retained.length === 0 || share < 0.99) {
    return finish(proposal, checks, passages, table.rows.length, retained.length, null, null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: the values could not be read as numbers under the proposed reading of the file.",
      missingCondition:
        retained.length === 0
          ? "At least one row matching the proposed filters."
          : "A reading of the file under which the value column is numeric.",
    });
  }

  const rawTotal = cells.reduce((a: number, v) => a + (v ?? 0), 0);

  // Adding rows together is only defined if a row is the flow of its own period.
  const additive = decideAdditivity(proposal, material, retained.length, add);

  // The unit, and how much of the unit claim the code can actually check.
  const unitOutcome = resolveUnit(proposal, material, table, retained, index, add);
  const unit = unitOutcome.unit;
  if (!additive.ok) {
    const perPeriod = summariseRestatements(proposal, retained, parsed, index, unit);
    return finish(proposal, checks, passages, table.rows.length, retained.length, rawTotal, null, {
      verdict: additive.semantics === "repeats_a_quantity_other_rows_carry" ? "out_of_scope" : "insufficient_information",
      statement:
        additive.semantics === "repeats_a_quantity_other_rows_carry"
          ? `Aggregation not executed under this definition. ${perPeriod}`.trim()
          : "Aggregation not executed: the publication does not say whether a row carries its own slice of the quantity or repeats one another row already carries.",
      missingCondition:
        additive.semantics === "repeats_a_quantity_other_rows_carry"
          ? "A field, in the publication, that distinguishes the consumption of a period from a figure restated for the whole year."
          : "A statement, by the publisher, that a row carries its own slice of the quantity.",
    });
  }
  if (!unit) {
    return finish(proposal, checks, passages, table.rows.length, retained.length, rawTotal, null, {
      verdict: "insufficient_information",
      statement:
        "The rows were kept and added, and the total is given below in the publisher's own unit. The conversion to GWh was not executed, because the unit of the value column is not declared in the material the publisher supplies.",
      missingCondition: `A statement, by the publisher, of the unit of "${proposal.valueColumns.join(", ")}".`,
    });
  }

  if (proposal.valueColumns.length > 1) {
    add({
      id: "columns_are_parts_of_one_whole",
      label: "The added columns are parts of one whole",
      by: "model",
      outcome: "not_applicable",
      detail:
        "The code cannot check from the file that the added columns partition the quantity without overlap. This is the model's reading. Where a second, independently published file carries the same quantity, the comparison below settles it.",
    });
  }

  const f = factor(unit, TARGET_UNIT);
  const valueGwh = convert(rawTotal, unit, TARGET_UNIT);
  const valueGj = convert(rawTotal, unit, "GJ");
  add({
    id: "conversion_executed",
    label: "Unit conversion executed",
    by: "code",
    outcome: "pass",
    detail: `${unitStatement(unit, TARGET_UNIT)}. ${format(rawTotal)} ${unit} converts to ${format(valueGwh)} ${TARGET_UNIT}. The same quantity in joules: ${unitStatement("MWh", "GJ")}, so ${format(valueGj)} GJ.`,
  });

  const inBand = valueGwh >= BAND.minGwh && valueGwh <= BAND.maxGwh;
  add({
    id: "result_is_of_the_kind_asked_for",
    label: "The result is a quantity of the kind the operation asks for",
    by: "code",
    outcome: inBand ? "pass" : "fail",
    detail: `${format(valueGwh)} ${TARGET_UNIT} against a band of ${format(BAND.minGwh)} to ${format(BAND.maxGwh)} ${TARGET_UNIT}. ${BAND.origin}`,
  });

  const conversion = {
    fromUnit: unit,
    toUnit: TARGET_UNIT,
    factor: f,
    input: rawTotal,
    output: valueGwh,
    statement: unitStatement(unit, TARGET_UNIT),
    joules: {
      unit: "GJ" as Unit,
      factor: factor("MWh", "GJ"),
      output: valueGj,
      statement: unitStatement("MWh", "GJ"),
    },
  };

  if (!inBand) {
    const unitPassage = passages.find((p) => p.quote === proposal.unitEvidence.quote) ?? {
      quote: proposal.unitEvidence.quote ?? "",
      where: proposal.unitEvidence.kind === "column" ? ("file" as const) : ("documentation" as const),
      located: true,
      supports: "the unit of the value column",
    };
    const objectPassage: Passage = {
      quote: material.objectPassage.quote,
      where: material.objectPassage.where,
      located: locate(material.objectPassage.quote, material.objectPassage.where, material),
      supports: "what the published table describes",
    };
    return finish(proposal, checks, passages, table.rows.length, retained.length, rawTotal, conversion, {
      verdict: "documentary_contradiction",
      statement:
        "Two published statements about the same object cannot both hold under this operation: the declared unit, and what the table is said to describe. Both are reproduced below, and no arbitration between them is invented here. The operation is not executed.",
      incompatiblePassages: [unitPassage, objectPassage],
    });
  }

  return finish(proposal, checks, passages, table.rows.length, retained.length, rawTotal, conversion, {
    verdict: "admissible",
    statement: `The conditions this program checks are met. ${format(valueGwh)} ${TARGET_UNIT} for the kept rows.`,
  });
}

interface Additivity {
  ok: boolean;
  semantics: Proposal["rowSemantics"];
}

function decideAdditivity(
  proposal: Proposal,
  material: Material,
  retainedCount: number,
  add: (c: Check) => Check,
): Additivity {
  if (retainedCount <= 1) {
    add({
      id: "rows_are_additive",
      label: "The kept rows may be added together",
      by: "code",
      outcome: "not_applicable",
      detail: "One row kept. Nothing is added across periods.",
    });
    return { ok: true, semantics: proposal.rowSemantics };
  }
  const quoteFound = locateAnywhere(proposal.rowSemanticsEvidence.quote, material);
  const semantics = quoteFound ? proposal.rowSemantics : "not_stated";
  const ok = semantics === "its_own_slice";
  add({
    id: "rows_are_additive",
    label: "The kept rows may be added together",
    by: "code",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? `${retainedCount} rows added. The publication states that each row carries its own slice: "${proposal.rowSemanticsEvidence.quote}"`
      : semantics === "repeats_a_quantity_other_rows_carry"
        ? `${retainedCount} rows kept and not added. The publication documents the value as a figure for a whole year, filed once under every period of that year: "${proposal.rowSemanticsEvidence.quote}" Adding rows that carry the same quantity would count it more than once.`
        : `${retainedCount} rows kept and not added. Nothing in the file or in the documentation says whether a row carries its own slice of the quantity.`,
  });
  return { ok, semantics };
}

function resolveUnit(
  proposal: Proposal,
  material: Material,
  table: Table,
  retained: string[][],
  index: (name: string) => number,
  add: (c: Check) => Check,
): { unit: Unit | null } {
  if (proposal.unitEvidence.kind === "column" && proposal.unitColumn) {
    const col = index(proposal.unitColumn);
    const values = new Set(retained.map((r) => (r[col] ?? "").trim()));
    const only = values.size === 1 ? [...values][0] : null;
    const ok = only !== null && isUnit(only);
    add({
      id: "unit_declared",
      label: "The unit is declared, and the code can check the declaration",
      by: "code",
      outcome: ok ? "pass" : "fail",
      detail: ok
        ? `The file carries a unit column. Every kept row declares "${only}", and the code reads it directly. No interpretation is involved.`
        : values.size === 1
          ? `The unit column declares "${only}", which this program does not convert.`
          : `The unit column does not agree across the kept rows: ${[...values].map((v) => `"${v}"`).join(", ")}.`,
    });
    return { unit: ok ? (only as Unit) : null };
  }

  const found = locateAnywhere(proposal.unitEvidence.quote, material);
  const declared = proposal.declaredUnit !== "not_declared" && isUnit(proposal.declaredUnit);
  const ok = found && declared;
  add({
    id: "unit_declared",
    label: "The unit is declared in the publisher's documentation",
    by: "code",
    outcome: ok ? "pass" : "fail",
    detail: found
      ? `The passage is published, and the code found it in the documentation kept here: "${proposal.unitEvidence.quote}"`
      : proposal.unitEvidence.kind === "not_declared"
        ? "No passage in the file or in the documentation states the unit of the value column."
        : `The passage offered in support of the unit is not in the material: "${proposal.unitEvidence.quote}". It supports nothing here.`,
  });
  if (ok) {
    add({
      id: "unit_symbol_read_from_prose",
      label: "Reading those published words as a unit symbol",
      by: "model",
      outcome: "not_applicable",
      detail: `The code checked that the passage is published. Reading it as ${proposal.declaredUnit} is the model's reading of the publisher's words, and the code cannot check that step. Where a file carries its unit in a column instead, this step does not exist.`,
    });
  }
  return { unit: ok ? (proposal.declaredUnit as Unit) : null };
}

function summariseRestatements(
  proposal: Proposal,
  retained: string[][],
  parsed: (number | null)[][],
  index: (name: string) => number,
  unit: Unit | null,
): string {
  const by = proposal.periodColumn ? index(proposal.periodColumn) : -1;
  if (by < 0) return "";
  const groups = new Map<string, number>();
  retained.forEach((row, i) => {
    const key = (row[by] ?? "").trim();
    const value = parsed[i].reduce((a: number, v) => a + (v ?? 0), 0);
    groups.set(key, (groups.get(key) ?? 0) + value);
  });
  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 2) return "";
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const listed = entries.slice(0, 8);
  const show = (v: number) =>
    unit ? `${format(convert(v, unit, TARGET_UNIT))} ${TARGET_UNIT}` : `${format(v)} (unit not declared)`;
  const shown =
    listed.map(([k, v]) => `${k} = ${show(v)}`).join(", ") +
    (entries.length > listed.length ? `, and ${entries.length - listed.length} more` : "");
  const values = entries.map(([, v]) => v);
  const spread = (Math.max(...values) - Math.min(...values)) / Math.max(...values);
  return `The file carries one figure per period: ${shown}. They differ from one another by at most ${(spread * 100).toFixed(
    1,
  )} per cent, and adding them gives ${show(
    total,
  )} for a year the publication says is worth one of them. Which one is the year's figure, and whether such a figure may be published as a year's consumption at all, are not decided here.`;
}

function finish(
  proposal: Proposal,
  checks: Check[],
  passages: Passage[],
  rowsRead: number,
  rowsRetained: number,
  rawTotal: number | null,
  conversion: Execution["conversion"],
  outcome: Outcome,
): Execution {
  const unlocated = passages.filter((p) => !p.located).length;
  // A passage that is not in the material supports nothing. It never rescues a
  // decision and it never sinks one either: the decision rests on the checks
  // the code ran itself. It is said out loud, and struck through on the page.
  const note =
    unlocated === 0
      ? ""
      : ` ${unlocated === 1 ? "One passage" : `${unlocated} passages`} cited in support of the correspondence could not be found in the material and support nothing here.`;
  return {
    verdict: outcome.verdict,
    statement: outcome.statement + note,
    missingCondition: outcome.missingCondition ?? null,
    incompatiblePassages: outcome.incompatiblePassages ?? [],
    checks,
    passages,
    rowsRead,
    rowsRetained,
    rawTotal,
    conversion,
    valueGwh: outcome.verdict === "admissible" && conversion ? conversion.output : null,
    valueGj: outcome.verdict === "admissible" && conversion ? convert(conversion.input, conversion.fromUnit, "GJ") : null,
    openQuestion: proposal.openQuestion,
  };
}

/**
 * Two figures for the same quantity, published independently of one another.
 * Agreement is not a quality score: it is the only thing in this program that
 * confirms a total from outside the file it came from.
 */
export function crossCheck(a: number, b: number, tolerance = CROSS_CHECK_TOLERANCE_GWH) {
  const difference = Math.abs(a - b);
  return {
    agree: difference <= tolerance,
    difference,
    statement:
      difference <= tolerance
        ? `${format(a)} and ${format(b)} ${TARGET_UNIT}, from two files published separately, differ by ${format(difference)} ${TARGET_UNIT}.`
        : `${format(a)} and ${format(b)} ${TARGET_UNIT} differ by ${format(difference)} ${TARGET_UNIT}, more than the ${tolerance} ${TARGET_UNIT} this program treats as agreement.`,
  };
}

export function format(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 6;
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
