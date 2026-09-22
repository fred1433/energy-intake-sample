/**
 * A deterministic description of a delimited file: its header, what each column
 * actually contains, and a verbatim window of its first rows.
 *
 * This is what a reader would do first, and it is done by code so that the same
 * file always yields the same description. The model reads this description; it
 * never reads the whole file, which for one of the publications here is thirteen
 * megabytes and two hundred thousand rows.
 */
import { parse } from "./table";

const MAX_LISTED_VALUES = 40;
const SAMPLE_ROWS = 120;

export interface ColumnProfile {
  name: string;
  distinct: number;
  /** Listed in full when the column is a small vocabulary, otherwise a few examples. */
  values: string[];
  listedInFull: boolean;
}

export interface FileProfile {
  header: string[];
  /** Counted from the file, not assumed. */
  delimiter: string;
  rowsCounted: number;
  columns: ColumnProfile[];
  firstLines: string[];
}

/**
 * Which character separates the fields, decided by counting rather than assumed:
 * the candidate that gives the same number of fields on every one of the first
 * lines, and the most of them. The published files here disagree on this.
 */
export function sniffDelimiter(text: string): string {
  const lines = text.split("\n").slice(0, 30).filter((l) => l.trim() !== "");
  let best = ",";
  let bestScore = -1;
  for (const candidate of [";", ",", "\t", "|"]) {
    const counts = lines.map((l) => l.split(candidate).length);
    const consistent = counts.every((c) => c === counts[0]);
    const score = consistent && counts[0] > 1 ? counts[0] : 0;
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

export function profile(text: string, delimiter: string): FileProfile {
  const table = parse(text, delimiter);
  const columns: ColumnProfile[] = table.header.map((name, i) => {
    const seen = new Set<string>();
    let capped = false;
    for (const row of table.rows) {
      seen.add((row[i] ?? "").trim());
      if (seen.size > MAX_LISTED_VALUES) { capped = true; break; }
    }
    if (!capped) {
      return { name, distinct: seen.size, values: [...seen].sort(), listedInFull: true };
    }
    // Spread the examples over the whole file: the first rows of a long file are
    // often all the same day, or all of one kind.
    const examples: string[] = [];
    const stride = Math.max(1, Math.floor(table.rows.length / SAMPLE_ROWS));
    for (let r = 0; r < table.rows.length && examples.length < 8; r += stride) {
      const v = (table.rows[r][i] ?? "").trim();
      if (v && !examples.includes(v)) examples.push(v);
    }
    return { name, distinct: -1, values: examples, listedInFull: false };
  });
  return {
    header: table.header,
    delimiter,
    rowsCounted: table.rows.length,
    columns,
    firstLines: text.split("\n").slice(0, 16).map((l) => l.replace(/\r$/, "")),
  };
}

export function renderProfile(p: FileProfile): string {
  const lines = [
    `Read with ${JSON.stringify(p.delimiter)} between fields, the file has ${p.header.length} columns and ${p.rowsCounted} data rows.`,
    "",
    "First lines of the file, copied exactly:",
    ...p.firstLines.map((l) => `  ${l}`),
    "",
    "What each column contains:",
    ...p.columns.map((c) =>
      c.listedInFull
        ? `  "${c.name}": ${c.distinct} distinct values: ${c.values.map((v) => JSON.stringify(v)).join(", ")}`
        : `  "${c.name}": many distinct values, for example ${c.values.map((v) => JSON.stringify(v)).join(", ")}`,
    ),
  ];
  return lines.join("\n");
}
