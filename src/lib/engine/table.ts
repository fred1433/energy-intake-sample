/**
 * Reading a delimited file the way the proposal says it is written.
 *
 * The dialect is part of the proposal, so it is also part of what the code
 * checks: a delimiter or a decimal mark that is wrong shows up immediately as a
 * value column that does not parse as numbers, and that is a named failure
 * rather than a silent one. Several of the published files in this repository
 * differ on exactly these points.
 */
import type { Dialect } from "./types";

export interface Table {
  header: string[];
  rows: string[][];
}

export function decode(bytes: Uint8Array, encoding: Dialect["encoding"]): string {
  if (encoding === "utf-8-bom" || encoding === "utf-8") {
    const text = new TextDecoder("utf-8").decode(bytes);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }
  return new TextDecoder(encoding === "iso-8859-1" ? "iso-8859-1" : "windows-1252").decode(bytes);
}

/** A delimited reader with quoting, enough for the published files this program reads. */
export function parse(text: string, delimiter: string): Table {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") { quoted = true; continue; }
    if (c === delimiter) { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (c === "\r") continue;
    field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  const header = (rows.shift() ?? []).map((h) => h.trim());
  return { header, rows: rows.filter((r) => r.length > 1 || (r[0] ?? "") !== "") };
}

/**
 * A published number read under the proposed dialect. Returns null rather than
 * NaN so that a column that does not parse is counted, not silently zeroed.
 */
export function parseNumber(raw: string, dialect: Dialect): number | null {
  let s = raw.trim();
  if (s === "") return null;
  if (dialect.thousandsSeparator !== "none") s = s.split(dialect.thousandsSeparator).join("");
  if (dialect.decimalSeparator === ",") s = s.replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
