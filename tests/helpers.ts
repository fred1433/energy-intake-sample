import { readFileSync } from "node:fs";
import path from "node:path";
import type { Proposal } from "../src/lib/engine/types";

export interface RecordedRun {
  fileId: string;
  proposal: Proposal;
  usage: { model: string; inputTokens: number; outputTokens: number };
  recordedAt: string;
}

export function recorded(caseId: string): RecordedRun[] {
  const file = path.join(process.cwd(), "src", "recorded", `${caseId}.json`);
  return (JSON.parse(readFileSync(file, "utf-8")) as { runs: RecordedRun[] }).runs;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
