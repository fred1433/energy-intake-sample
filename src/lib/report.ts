/**
 * Everything the page shows, assembled once.
 *
 * The engine runs here, over proposals recorded beforehand and over the bytes
 * kept in data/. Opening the page calls no model. The one button that does is
 * in the route beside this file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { crossCheck, format } from "./engine/execute";
import { BAND, CROSS_CHECK_TOLERANCE_GWH, OPERATION, TARGET_UNIT } from "./engine/operation";
import type { Execution, Proposal } from "./engine/types";
import { runOne } from "./run";
import { CASES, type CaseDef } from "./sources";

export interface RecordedRun {
  fileId: string;
  proposal: Proposal;
  usage: { model: string; inputTokens: number; outputTokens: number };
  recordedAt: string;
}

export interface CaseReport {
  def: CaseDef;
  runs: { run: RecordedRun; label: string; execution: Execution }[];
  /** Set when two files published separately carry the same quantity. */
  agreement: { agree: boolean; difference: number; statement: string } | null;
}

function recordedRuns(caseId: string): RecordedRun[] {
  const file = path.join(process.cwd(), "src", "recorded", `${caseId}.json`);
  return (JSON.parse(readFileSync(file, "utf-8")) as { runs: RecordedRun[] }).runs;
}

export function report(): CaseReport[] {
  return CASES.map((def) => {
    const runs = recordedRuns(def.id).map((run) => ({
      run,
      label: def.files.find((f) => f.id === run.fileId)!.label,
      execution: runOne(run.fileId, run.proposal),
    }));
    const values = runs.map((r) => r.execution.valueGwh).filter((v): v is number => v !== null);
    const agreement =
      values.length === 2 ? crossCheck(values[0], values[1], CROSS_CHECK_TOLERANCE_GWH) : null;
    return { def, runs, agreement };
  });
}

export interface ExportRow {
  city: string;
  year: string;
  value_gwh: string;
  value_gj: string;
  decision: string;
  source_retrieved: string;
}

export function exportRows(reports: CaseReport[]): ExportRow[] {
  return reports.map(({ def, runs }) => {
    const first = runs[0].execution;
    return {
      city: def.city,
      year: def.year,
      value_gwh: first.valueGwh === null ? "" : first.valueGwh.toFixed(2),
      value_gj: first.valueGj === null ? "" : first.valueGj.toFixed(0),
      decision: first.verdict,
      source_retrieved: def.retrievedAt,
    };
  });
}

export function exportCsv(rows: ExportRow[]): string {
  const header = ["city", "year", "value_gwh", "value_gj", "decision", "source_retrieved"];
  const lines = [header.join(",")];
  for (const row of rows) lines.push(header.map((h) => row[h as keyof ExportRow]).join(","));
  return lines.join("\n") + "\n";
}

export { VERDICT_LABEL } from "./engine/verdicts";
export { BAND, format, OPERATION, TARGET_UNIT };
