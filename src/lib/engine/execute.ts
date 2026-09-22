/**
 * The code half of the chain.
 *
 * The model proposes a correspondence. This file acts on the parts of it that
 * can be checked against the material, and refuses the rest by naming the
 * condition that is missing. It never repairs a proposal and never guesses a
 * value that was not published.
 *
 * Three things are deliberately not done here. No result is compared with
 * another city's. No publication is scored. No cause is attributed when a total
 * lands outside the band this program accepts: the total, the band and its
 * origin are shown, and the operation stops without saying whose fault it is.
 */
import { BAND, CROSS_CHECK_TOLERANCE_GWH, TARGET_UNIT } from "./operation";
import { parse, parseNumber, type Table } from "./table";
import { convert, factor, isUnit, namesUnit, statement as unitStatement } from "./units";
import type { Ask, Check, Execution, Magnitude, Passage, Proposal, Unit, Verdict } from "./types";

export interface Material {
  /** The published file, decoded under the proposed dialect. */
  fileText: string;
  /** What the publisher documents beside the file, copied verbatim. */
  documentation: string;
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
  headline: string;
  missingCondition?: string | null;
  magnitude?: Magnitude | null;
  /** The one check that ended the operation. Every other failure is local. */
  stoppedAt?: string;
}

export function execute(proposal: Proposal, material: Material, ask: Ask): Execution {
  const checks: Check[] = [];
  const add = (c: Omit<Check, "stops"> & { stops?: boolean }) => {
    checks.push({ stops: false, ...c });
  };

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
            .join("; ")}. A passage that is not in the material supports nothing here. Whether that sinks the operation depends on what it was offered for, checked one condition at a time below.`,
  });

  const table = parse(material.fileText, proposal.dialect.delimiter);
  const named = [...proposal.valueColumns, ...proposal.rowFilters.map((f) => f.column)];
  if (proposal.unitColumn) named.push(proposal.unitColumn);
  if (proposal.periodColumn) named.push(proposal.periodColumn);
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
    return finish(proposal, ask, checks, passages, 0, 0, [], null, [], null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: a column the correspondence relies on is not in the published file.",
      headline: "A named column is not in the published file.",
      missingCondition: `A column named ${absent.map((c) => `"${c}"`).join(", ")} in the published file.`,
      stoppedAt: "columns_exist",
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
    return finish(proposal, ask, checks, passages, table.rows.length, 0, [], null, [], null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: a value the correspondence filters on never occurs in the published file.",
      headline: "A filter value never occurs in the published file.",
      missingCondition: `A row where ${missingValues.map((f) => `${f.column} = ${f.equals}`).join(" and ")}.`,
      stoppedAt: "filter_values_present",
    });
  }

  const retained = table.rows.filter((r) =>
    proposal.rowFilters.every((f) => (r[index(f.column)] ?? "").trim() === f.equals),
  );

  // What was asked for, and what the kept rows are actually filed under. The
  // two are checked against each other rather than assumed to match: a
  // correspondence that runs cleanly on the wrong period is still the wrong
  // answer, and it must never leave here carrying the label that was asked for.
  const allPeriods = periodsOf(proposal, retained, index);
  const wrongPeriod = allPeriods.filter((p) => !filedUnder(p, ask.period));
  const periods = allPeriods.slice(0, 12);
  add({
    id: "period_matches_request",
    label: "The kept rows are filed under the period the operation asks for",
    by: "code",
    outcome: proposal.periodColumn === null ? "fail" : wrongPeriod.length === 0 ? "pass" : "fail",
    detail:
      proposal.periodColumn === null
        ? "The correspondence names no column saying which period a row is filed under, so the code cannot check the kept rows against the period asked for."
        : wrongPeriod.length === 0
          ? `${retained.length.toLocaleString("en-GB")} kept rows, every one of them filed under ${list(
              allPeriods,
            )} in "${proposal.periodColumn}". The operation asks for ${ask.period}.`
          : `Kept rows are filed under ${list(wrongPeriod)} in "${
              proposal.periodColumn
            }". The operation asks for ${ask.period}.`,
  });
  if (proposal.periodColumn === null || wrongPeriod.length > 0) {
    return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, null, [], null, {
      verdict: "out_of_scope",
      statement:
        proposal.periodColumn === null
          ? `The operation asks for ${ask.period}, and nothing in the correspondence says which period a kept row is filed under. Nothing produced from it is labelled ${ask.period} here.`
          : `The operation asks for ${ask.period}. The kept rows are filed under ${list(
              wrongPeriod,
            )}. The operation was not executed, and nothing produced from these rows is labelled ${ask.period} here.`,
      headline:
        proposal.periodColumn === null
          ? `No column says which period a kept row is filed under, so nothing can be labelled ${ask.period}.`
          : `Rows are filed under ${list(wrongPeriod)}, not ${ask.period}.`,
      missingCondition: `Rows filed under ${ask.period}${
        proposal.periodColumn ? ` in "${proposal.periodColumn}"` : ""
      }.`,
      stoppedAt: "period_matches_request",
    });
  }

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
    return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, null, [], null, {
      verdict: "insufficient_information",
      statement: "The operation was not executed: the values could not be read as numbers under the proposed reading of the file.",
      headline: "The value column does not read as numbers under the proposed reading.",
      missingCondition:
        retained.length === 0
          ? "At least one row matching the proposed filters."
          : "A reading of the file under which the value column is numeric.",
      stoppedAt: "values_are_numbers",
    });
  }

  const rawTotal = cells.reduce((a: number, v) => a + (v ?? 0), 0);
  // What each added column contributed, so that a total made of several columns
  // can be added up again by hand from the page.
  const parts = proposal.valueColumns.map((column, i) => ({
    column,
    value: parsed.reduce((a: number, row) => a + (row[i] ?? 0), 0),
  }));

  // Adding rows together is only defined if a row is the flow of its own period.
  const additive = decideAdditivity(proposal, material, retained.length, add);

  // The unit, and how much of the unit claim the code can actually check.
  const unitOutcome = resolveUnit(proposal, material, table, retained, index, add);
  const unit = unitOutcome.unit;
  if (!additive.ok) {
    const perPeriod = summariseRestatements(proposal, retained, parsed, index, unit);
    return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, rawTotal, parts, null, {
      verdict: additive.semantics === "repeats_a_quantity_other_rows_carry" ? "out_of_scope" : "insufficient_information",
      statement:
        additive.semantics === "repeats_a_quantity_other_rows_carry"
          ? `Aggregation not executed under this definition. ${perPeriod}`.trim()
          : "Aggregation not executed: the publication does not say whether a row carries its own slice of the quantity or repeats one another row already carries.",
      headline:
        additive.semantics === "repeats_a_quantity_other_rows_carry"
          ? "The value is documented as a figure for a whole period, filed once under each sub-period."
          : "The publication does not say whether the kept rows may be added together.",
      missingCondition:
        additive.semantics === "repeats_a_quantity_other_rows_carry"
          ? `Which quantity the operation wants: the one realised over ${ask.period}, which this publication does not carry, or a figure restated for the period at a reference date, which it does carry once per sub-period and which then needs a stated rule for choosing that reference date.`
          : "A statement, by the publisher, that a row carries its own slice of the quantity.",
      stoppedAt: additive.stoppedAt,
    });
  }
  if (!unit) {
    return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, rawTotal, parts, null, {
      verdict: "insufficient_information",
      statement:
        "The rows were kept and added, and the total is given below in the publisher's own unit. The conversion to GWh was not executed, because the unit of the value column is not established from the material the publisher supplies. This is the first blocking condition, not a claim that it is the only one left.",
      headline: "First blocking condition: the unit of the value column is not established.",
      missingCondition: `A passage, in the publisher's own material, that states the unit of "${proposal.valueColumns.join(", ")}".`,
      stoppedAt: "unit_declared",
    });
  }

  if (proposal.valueColumns.length > 1) {
    add({
      id: "columns_are_parts_of_one_whole",
      label: "The added columns are parts of one whole",
      by: "model",
      outcome: "not_applicable",
      detail:
        "The code cannot check from the file that the added columns partition the quantity without overlap. This is the model's reading. Where a second, separately published file carries the same quantity, the comparison below is what tests it.",
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
  const magnitude: Magnitude = {
    rawTotal,
    unit,
    gwh: valueGwh,
    minGwh: BAND.minGwh,
    maxGwh: BAND.maxGwh,
    origin: BAND.origin,
  };
  add({
    id: "magnitude_within_band",
    label: "The total is inside the magnitude band this program applies",
    by: "code",
    outcome: inBand ? "pass" : "fail",
    detail: `${format(rawTotal)} ${unit} is ${format(valueGwh)} ${TARGET_UNIT}, against a band of ${format(
      BAND.minGwh,
    )} to ${format(BAND.maxGwh)} ${TARGET_UNIT}. ${BAND.origin}`,
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
    return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, rawTotal, parts, conversion, {
      verdict: "magnitude_check_failed",
      statement: `Magnitude check failed, and the operation stops here. Read under the unit the publisher declares, the kept rows total ${format(
        rawTotal,
      )} ${unit}, which is ${format(valueGwh)} ${TARGET_UNIT}. This program accepts a result between ${format(
        BAND.minGwh,
      )} and ${format(
        BAND.maxGwh,
      )} ${TARGET_UNIT}, a band of its own and not the publisher's. A total this far outside it can come from the unit, from the rows added, or from the perimeter kept, and nothing here decides which.`,
      headline: `${format(valueGwh)} ${TARGET_UNIT} under the declared unit, outside the ${format(BAND.minGwh)} to ${format(
        BAND.maxGwh,
      )} ${TARGET_UNIT} band this program applies.`,
      missingCondition: `Which of the three the total should be attributed to: the unit read from the publisher's words, the rows added, or the perimeter kept. The magnitude check cannot tell them apart, and this program does not choose.`,
      magnitude,
      stoppedAt: "magnitude_within_band",
    });
  }

  return finish(proposal, ask, checks, passages, table.rows.length, retained.length, periods, rawTotal, parts, conversion, {
    verdict: "admissible",
    statement: `The conditions this program checks are met. ${format(valueGwh)} ${TARGET_UNIT} for the kept rows.`,
    headline: "Every condition this program checks is met.",
  });
}

/** The distinct values the kept rows carry in the column saying which period they are filed under. */
function periodsOf(proposal: Proposal, retained: string[][], index: (name: string) => number): string[] {
  if (!proposal.periodColumn) return [];
  const at = index(proposal.periodColumn);
  if (at < 0) return [];
  return [...new Set(retained.map((r) => (r[at] ?? "").trim()))].sort();
}

/**
 * Is a row filed under the period asked for? Either the value is that period, or
 * it names a sub-period of it: "2024-3" and "2024-01-01" are filed under 2024,
 * "20240" and "2023" are not.
 */
function filedUnder(value: string, asked: string): boolean {
  if (value === asked) return true;
  if (!value.startsWith(asked)) return false;
  return !/[0-9]/.test(value.charAt(asked.length));
}

/** A list of values, shown in full when it is short and summarised when it is not. */
function list(values: string[], shown = 6): string {
  const head = values.slice(0, shown).map((v) => `"${v}"`).join(", ");
  return values.length <= shown ? head : `${head} and ${values.length - shown} more`;
}

interface Additivity {
  ok: boolean;
  semantics: Proposal["rowSemantics"];
  /** Which of the three lines ended the operation, when one of them did. */
  stoppedAt: string;
}

/**
 * Three different facts, shown as three lines rather than one.
 *
 * The model proposes that the kept rows may be added. The code looks for the
 * passage that proposal cites. The code adds the rows. Only the second and
 * third are the code's work, and even together they do not establish that the
 * cited passage implies the rows do not overlap.
 */
function decideAdditivity(
  proposal: Proposal,
  material: Material,
  retainedCount: number,
  add: (c: Omit<Check, "stops"> & { stops?: boolean }) => void,
): Additivity {
  if (retainedCount <= 1) {
    add({
      id: "rows_added",
      label: "Rows added together",
      by: "code",
      outcome: "not_applicable",
      detail: "One row kept. Nothing is added across rows, so nothing rests on rows being addable.",
    });
    return { ok: true, semantics: proposal.rowSemantics, stoppedAt: "rows_added" };
  }

  const claimed = proposal.rowSemantics === "its_own_slice";
  const quoteFound = locateAnywhere(proposal.rowSemanticsEvidence.quote, material);
  const semantics = quoteFound ? proposal.rowSemantics : "not_stated";
  const ok = semantics === "its_own_slice";

  // Fact one, and it is the model's alone: how it reads a row.
  add({
    id: "rows_are_additive",
    label: "The kept rows may be added together",
    by: "model",
    outcome: claimed ? "pass" : "fail",
    detail:
      proposal.rowSemantics === "its_own_slice"
        ? "The model reads each kept row as carrying its own slice of the quantity, no slice twice."
        : proposal.rowSemantics === "repeats_a_quantity_other_rows_carry"
          ? "The model reads the value as a figure for a whole period, filed once under each sub-period of it, so that adding the rows would count the same quantity more than once."
          : "The model does not read the publication as saying whether a row carries its own slice of the quantity.",
  });

  // Fact two, and this one is the code's: is the passage that reading rests on published at all.
  add({
    id: "additivity_passage_located",
    label: "The passage that reading rests on is in the material",
    by: "code",
    outcome: quoteFound ? "pass" : "fail",
    detail: quoteFound
      ? `Found, character for character, in the material kept here: "${proposal.rowSemanticsEvidence.quote}"`
      : proposal.rowSemanticsEvidence.quote
        ? `Not in the file and not in the documentation: "${proposal.rowSemanticsEvidence.quote}". It supports nothing here, so the reading falls back to "the publication does not say".`
        : "No passage was offered for this reading.",
  });

  // Fact three, also the code's, and narrower than the two above put together.
  add({
    id: "rows_added",
    label: "Rows added together",
    by: "code",
    outcome: ok ? "pass" : "not_applicable",
    detail: ok
      ? `${retainedCount.toLocaleString("en-GB")} rows summed into one total. The code found the cited passage and added the rows. It did not check that the passage implies the rows do not overlap: that reading stays the model's, and no check here replaces it.`
      : `${retainedCount.toLocaleString("en-GB")} rows kept and not added.`,
  });

  return { ok, semantics, stoppedAt: claimed && !quoteFound ? "additivity_passage_located" : "rows_are_additive" };
}

function resolveUnit(
  proposal: Proposal,
  material: Material,
  table: Table,
  retained: string[][],
  index: (name: string) => number,
  add: (c: Omit<Check, "stops"> & { stops?: boolean }) => void,
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

  const quote = proposal.unitEvidence.quote;
  const found = locateAnywhere(quote, material);
  const declared = proposal.declaredUnit !== "not_declared" && isUnit(proposal.declaredUnit);
  // A published passage offered in support of a unit it never names supports
  // nothing either. Finding the words is not the same as the words saying it.
  const names = found && declared && namesUnit(quote ?? "", proposal.declaredUnit as Unit);
  const ok = found && declared && names;
  add({
    id: "unit_declared",
    label: "The unit is declared in the publisher's documentation",
    by: "code",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? `The passage is published, the code found it in the material kept here, and it names ${proposal.declaredUnit}: "${quote}"`
      : proposal.unitEvidence.kind === "not_declared"
        ? "No passage in the file or in the documentation states the unit of the value column."
        : !found
          ? `The passage offered in support of the unit is not in the material: "${quote}". It supports nothing here.`
          : !declared
            ? `The passage is published, but the unit offered with it is not one this program converts.`
            : `The passage is published and the code found it, but it never names ${proposal.declaredUnit}: "${quote}". A published sentence offered for a unit it does not mention establishes nothing about that unit.`,
  });
  if (ok) {
    add({
      id: "unit_symbol_read_from_prose",
      label: "Reading those published words as the unit of this column",
      by: "model",
      outcome: "not_applicable",
      detail: `The code checked that the passage is published and that it names ${proposal.declaredUnit}. That this passage is about this column, and not about some other figure in the same publication, is the model's reading, and the code cannot check that step. Where a file carries its unit in a column instead, this step does not exist.`,
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
  return `The publisher documents this column as a figure for a whole period, and the file carries one such figure under each sub-period: ${shown}. They differ from one another by at most ${(spread * 100).toFixed(
    1,
  )} per cent, and adding them gives ${show(
    total,
  )}, which counts the same restated figure once per sub-period. None of them is therefore the quantity realised over the period: each is that period restated at its own reference date. Which quantity the operation wants, and which reference date, are not decided here.`;
}

function finish(
  proposal: Proposal,
  ask: Ask,
  checks: Check[],
  passages: Passage[],
  rowsRead: number,
  rowsRetained: number,
  periodsObserved: string[],
  rawTotal: number | null,
  parts: { column: string; value: number }[],
  conversion: Execution["conversion"],
  outcome: Outcome,
): Execution {
  if (outcome.stoppedAt) {
    const stopped = checks.find((c) => c.id === outcome.stoppedAt);
    if (stopped) stopped.stops = true;
  }
  const unlocated = passages.filter((p) => !p.located).length;
  // A passage that is not in the material supports nothing. It never rescues a
  // decision and it never sinks one either: the decision rests on the checks
  // the code ran itself, one condition at a time.
  const note =
    unlocated === 0
      ? ""
      : ` ${unlocated === 1 ? "One passage" : `${unlocated} passages`} cited in support of the correspondence could not be found in the material and support nothing here.`;
  return {
    verdict: outcome.verdict,
    statement: outcome.statement + note,
    headline: outcome.headline,
    missingCondition: outcome.missingCondition ?? null,
    checks,
    passages,
    rowsRead,
    rowsRetained,
    askedFor: ask.period,
    periodsObserved,
    rawTotal,
    parts,
    magnitude: outcome.magnitude ?? null,
    conversion,
    valueGwh: outcome.verdict === "admissible" && conversion ? conversion.output : null,
    valueGj: outcome.verdict === "admissible" && conversion ? convert(conversion.input, conversion.fromUnit, "GJ") : null,
    openQuestion: proposal.openQuestion,
  };
}

/**
 * Two figures for the same quantity, from two separately published files.
 * Agreement is not a quality score, and it is not an independent measurement
 * either: it is a reconciliation between publications, and the only thing in
 * this program that tests a total against something outside the file it came
 * from.
 */
export function crossCheck(a: number, b: number, tolerance = CROSS_CHECK_TOLERANCE_GWH) {
  const difference = Math.abs(a - b);
  return {
    agree: difference <= tolerance,
    difference,
    statement:
      difference <= tolerance
        ? `${format(a)} and ${format(b)} ${TARGET_UNIT}, from two separately published files, differ by ${format(difference)} ${TARGET_UNIT}.`
        : `${format(a)} and ${format(b)} ${TARGET_UNIT}, from two separately published files, differ by ${format(difference)} ${TARGET_UNIT}, more than the ${tolerance} ${TARGET_UNIT} this program treats as agreement.`,
  };
}

export function format(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 6;
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
