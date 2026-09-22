/**
 * A TEST THAT MODIFIES A PUBLISHED NOTE. Nothing below is real data.
 *
 * One publication states the unit of its value column in prose, in its own
 * catalogue record. Read as stated, the year comes out six orders of magnitude
 * above what this program accepts as a city total, and the program stops with
 * both published statements on the table.
 *
 * To show that the stop is driven by that note and not by a result written into
 * the code, this test changes the note, in memory, for the length of the test,
 * and checks that the decision changes the way it should. The copy kept in
 * data/ is never touched, and the last case here proves it.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { fileOf } from "../src/lib/sources";
import { materialFor, runOne } from "../src/lib/run";
import { clone, recorded } from "./helpers";

const [run] = recorded("barcelona");
const { source } = fileOf(run.fileId);
const asPublished = runOne(run.fileId, run.proposal);

const PUBLISHED_NOTE = "06.Valor = Consum elèctric en megawatt  hores";
const NOTE_ALTERED_FOR_THIS_TEST = "06.Valor = Consum elèctric en kilowatt  hores";

describe("as published", () => {
  it("reports a contradiction between two published statements", () => {
    expect(asPublished.verdict).toBe("documentary_contradiction");
    expect(asPublished.valueGwh).toBeNull();
  });

  it("shows both passages and invents no arbitration", () => {
    expect(asPublished.incompatiblePassages).toHaveLength(2);
    expect(asPublished.incompatiblePassages[0].quote).toBe(PUBLISHED_NOTE);
    expect(asPublished.incompatiblePassages[1].quote).toContain("in the city of Barcelona");
    for (const passage of asPublished.incompatiblePassages) expect(passage.located).toBe(true);
    expect(asPublished.statement).toContain("no arbitration between them is invented here");
  });

  it("still runs the conversion and shows its factor", () => {
    expect(asPublished.conversion?.fromUnit).toBe("MWh");
    expect(asPublished.conversion?.statement).toBe("1 MWh = 0.001 GWh");
    expect(asPublished.rawTotal).toBe(5_998_510_712);
  });
});

describe("with the unit note altered for this test only", () => {
  const altered = clone(run.proposal);
  altered.declaredUnit = "kWh";
  altered.unitEvidence = { kind: "documentation", quote: NOTE_ALTERED_FOR_THIS_TEST };
  altered.citations = altered.citations.map((c) =>
    c.quote === PUBLISHED_NOTE ? { ...c, quote: NOTE_ALTERED_FOR_THIS_TEST } : c,
  );
  const material = materialFor(source, altered.dialect.encoding);
  material.documentation = material.documentation.replace(PUBLISHED_NOTE, NOTE_ALTERED_FOR_THIS_TEST);
  const result = execute(altered, material);

  it("changes the decision, and only because the note changed", () => {
    expect(result.verdict).toBe("admissible");
    expect(result.valueGwh).toBeCloseTo(5998.510712, 6);
    expect(result.conversion?.statement).toBe("1 kWh = 0.000001 GWh");
  });

  it("adds the same rows and reads the same raw total as the published run", () => {
    expect(result.rowsRetained).toBe(asPublished.rowsRetained);
    expect(result.rawTotal).toBe(asPublished.rawTotal);
  });

  it("refuses the altered note if it is not in the material", () => {
    // The same altered proposal against the real documentation: the quote is
    // not there, so it supports nothing and the unit is not established.
    const real = execute(altered, materialFor(source, altered.dialect.encoding));
    expect(real.verdict).toBe("insufficient_information");
    expect(real.missingCondition).toContain("the unit of");
  });
});

describe("the kept copy", () => {
  it("is byte for byte what was downloaded, after all of the above", () => {
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "data", "MANIFEST.json"), "utf-8"));
    const entry = manifest.sources
      .flatMap((s: { files: { path: string; sha256: string; gzip: boolean }[] }) => s.files)
      .find((f: { path: string }) => f.path === source.file);
    const raw = readFileSync(path.join(process.cwd(), "data", source.file));
    const bytes = entry.gzip ? gunzipSync(raw) : raw;
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
    expect(readFileSync(path.join(process.cwd(), "data", source.documentation), "utf-8")).toContain(PUBLISHED_NOTE);
  });
});
