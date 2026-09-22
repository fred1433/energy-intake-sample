/**
 * Everything the page shows and everything the export carries, assembled once.
 *
 * The engine runs here, over proposals recorded beforehand and over the bytes
 * kept in data/. Opening the page calls no model. The one button that does is
 * in the route beside this file.
 *
 * One rule lives here and nowhere else: what the engine produced is not yet
 * what gets published. Where a case carries a second, separately published file
 * for the same quantity, the two have to agree before a value leaves this
 * program. The page and the export both read the published figure, never the
 * engine's, so a reconciliation that fails cannot be announced as a success.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { crossCheck, format } from "./engine/execute";
import { BAND, CROSS_CHECK_TOLERANCE_GWH, OPERATION, TARGET_UNIT } from "./engine/operation";
import type { Execution, Proposal, Verdict } from "./engine/types";
import { runOne } from "./run";
import { CASES, type CaseDef } from "./sources";

/** Where a reader of the export comes back to, per row. */
export const PAGE = "https://energy-intake.theaipipe.com";

export interface RecordedRun {
  fileId: string;
  proposal: Proposal;
  usage: { model: string; inputTokens: number; outputTokens: number };
  recordedAt: string;
}

export interface Reconciliation {
  agree: boolean;
  difference: number;
  statement: string;
}

/** What actually leaves this program, as opposed to what the engine produced. */
export interface Publication {
  decision: Verdict;
  valueGwh: number | null;
  valueGj: number | null;
  /** One short clause, the same one in the table and in the export. */
  reason: string;
  /** Set when the engine produced a value and this program did not publish it. */
  withheld: string | null;
  reconciliation: Reconciliation | null;
}

export interface CaseReport {
  def: CaseDef;
  runs: { run: RecordedRun; label: string; execution: Execution }[];
  reconciliation: Reconciliation | null;
  publication: Publication;
}

function recordedRuns(caseId: string): RecordedRun[] {
  const file = path.join(process.cwd(), "src", "recorded", `${caseId}.json`);
  return (JSON.parse(readFileSync(file, "utf-8")) as { runs: RecordedRun[] }).runs;
}

export function reconcile(executions: Execution[]): Reconciliation | null {
  const values = executions.map((e) => e.valueGwh).filter((v): v is number => v !== null);
  return values.length === 2 ? crossCheck(values[0], values[1], CROSS_CHECK_TOLERANCE_GWH) : null;
}

/**
 * The publication lock. A case that carries two separately published files for
 * the same quantity publishes nothing until they agree.
 */
export function publicationOf(executions: Execution[], reconciliation: Reconciliation | null): Publication {
  const first = executions[0];
  if (first.verdict !== "admissible") {
    return {
      decision: first.verdict,
      valueGwh: null,
      valueGj: null,
      reason: first.headline,
      withheld: null,
      reconciliation,
    };
  }
  if (executions.length > 1 && !(reconciliation && reconciliation.agree)) {
    const detail = reconciliation
      ? reconciliation.statement
      : "The second file did not produce a figure to compare with.";
    return {
      decision: "insufficient_information",
      valueGwh: null,
      valueGj: null,
      reason: "Two separately published files for the same quantity do not agree, so nothing is published.",
      withheld: `The engine produced ${format(
        first.valueGwh!,
      )} ${TARGET_UNIT} from the first file, and this program did not publish it. ${detail} Nothing here chooses between them.`,
      reconciliation,
    };
  }
  return {
    decision: "admissible",
    valueGwh: first.valueGwh,
    valueGj: first.valueGj,
    reason: reconciliation ? reconciliation.statement : first.headline,
    withheld: null,
    reconciliation,
  };
}

export function report(): CaseReport[] {
  return CASES.map((def) => {
    const runs = recordedRuns(def.id).map((run) => ({
      run,
      label: def.files.find((f) => f.id === run.fileId)!.label,
      execution: runOne(run.fileId, run.proposal, def.year),
    }));
    const executions = runs.map((r) => r.execution);
    const reconciliation = reconcile(executions);
    return { def, runs, reconciliation, publication: publicationOf(executions, reconciliation) };
  });
}

export interface ExportRow {
  city: string;
  year: string;
  value_gwh: string;
  value_gj: string;
  decision: string;
  reason: string;
  evidence: string;
  source_url: string;
  source_retrieved: string;
}

export const EXPORT_HEADER = [
  "city",
  "year",
  "value_gwh",
  "value_gj",
  "decision",
  "reason",
  "evidence",
  "source_url",
  "source_retrieved",
] as const;

/**
 * The export carries the reason and a way back to the evidence, so that a row
 * without a value still says what would have to be settled, and where to look.
 */
export function exportRows(reports: CaseReport[]): ExportRow[] {
  return reports.map(({ def, runs, publication }) => ({
    city: def.city,
    year: def.year,
    value_gwh: publication.valueGwh === null ? "" : publication.valueGwh.toFixed(2),
    value_gj: publication.valueGj === null ? "" : publication.valueGj.toFixed(0),
    decision: publication.decision,
    reason: publication.withheld ?? publication.reason,
    evidence: `${PAGE}/#${def.id}`,
    source_url: runs[0] ? def.files.find((f) => f.id === runs[0].run.fileId)!.url : def.files[0].url,
    source_retrieved: def.retrievedAt,
  }));
}

function field(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_HEADER.join(",")];
  for (const row of rows) lines.push(EXPORT_HEADER.map((h) => field(row[h])).join(","));
  return lines.join("\n") + "\n";
}

export { VERDICT_LABEL, VERDICT_MEANING } from "./engine/verdicts";
export { BAND, format, OPERATION, TARGET_UNIT };
