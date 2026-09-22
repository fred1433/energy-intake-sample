/**
 * The claim this file makes checkable: the engine knows nothing about any of
 * the four publications. Everything specific to one of them comes from a
 * proposal a model wrote after reading the publisher's own material.
 *
 * The strong form of the claim is the last case: rename every column in a file
 * and in the proposal that reads it, and the engine produces the same answer.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { parse } from "../src/lib/engine/table";
import { CASES, fileOf } from "../src/lib/sources";
import { materialFor, runOne } from "../src/lib/run";
import { clone, recorded, YEAR } from "./helpers";

const ENGINE = path.join(process.cwd(), "src", "lib", "engine");
const files = readdirSync(ENGINE)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => ({ name: f, text: readFileSync(path.join(ENGINE, f), "utf-8") }));

/** Every column name, filter value and city the four recorded proposals rely on. */
function specifics(): string[] {
  const words = new Set<string>();
  for (const caseDef of CASES) {
    words.add(caseDef.city);
    for (const run of recorded(caseDef.id)) {
      for (const c of run.proposal.valueColumns) words.add(c);
      for (const f of run.proposal.rowFilters) { words.add(f.column); words.add(f.equals); }
      if (run.proposal.unitColumn) words.add(run.proposal.unitColumn);
      if (run.proposal.periodColumn) words.add(run.proposal.periodColumn);
    }
  }
  return [...words].filter((w) => w.length > 3 && !/^\d+$/.test(w));
}

describe("the engine names nothing from any publication", () => {
  it("is made of at least the five files the chain runs through", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  for (const word of specifics()) {
    it(`never writes ${JSON.stringify(word)}`, () => {
      // Whole word, same case: the engine is free to use "unit" or "year" as
      // English, and must never carry a publication's own spelling of them.
      const pattern = new RegExp(`(^|[^\\w])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w]|$)`);
      for (const file of files) expect(pattern.test(file.text)).toBe(false);
    });
  }

  it("never imports the catalogue of publications, or reaches outside itself", () => {
    for (const file of files) {
      const imports = [...file.text.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
      for (const spec of imports) expect(spec.startsWith("./")).toBe(true);
    }
  });
});

/** Replaces every column name with a meaningless one, in the file and in the proposal. */
function renameColumns(fileText: string, delimiter: string) {
  const header = parse(fileText, delimiter).header;
  const renamed = new Map(header.map((name, i) => [name, `c${i + 1}`]));
  const lines = fileText.split("\n");
  lines[0] = header.map((name) => renamed.get(name)!).join(delimiter);
  return { text: lines.join("\n"), renamed };
}

describe("renaming every column changes nothing", () => {
  for (const caseId of ["vienna", "ghent"]) {
    for (const run of recorded(caseId)) {
      it(`${run.fileId} reaches the same answer under meaningless column names`, () => {
        const before = runOne(run.fileId, run.proposal, YEAR);
        const { source } = fileOf(run.fileId);
        const material = materialFor(source, run.proposal.dialect.encoding);
        const { text, renamed } = renameColumns(material.fileText, run.proposal.dialect.delimiter);
        material.fileText = text;

        const p = clone(run.proposal);
        p.valueColumns = p.valueColumns.map((c) => renamed.get(c) ?? c);
        p.rowFilters = p.rowFilters.map((f) => ({ ...f, column: renamed.get(f.column) ?? f.column }));
        p.unitColumn = p.unitColumn ? (renamed.get(p.unitColumn) ?? p.unitColumn) : null;
        p.periodColumn = p.periodColumn ? (renamed.get(p.periodColumn) ?? p.periodColumn) : null;

        const after = execute(p, material, { period: YEAR });
        expect(after.verdict).toBe(before.verdict);
        expect(after.rowsRetained).toBe(before.rowsRetained);
        expect(after.rawTotal).toBe(before.rawTotal);
        expect(after.valueGwh).toBe(before.valueGwh);
      });
    }
  }
});
