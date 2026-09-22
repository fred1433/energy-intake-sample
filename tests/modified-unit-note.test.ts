/**
 * A TEST THAT MODIFIES A PUBLISHED NOTE. Nothing below is real data.
 *
 * One publication states the unit of its value column in prose, in its own
 * catalogue record. Read as stated, the year comes out six orders of magnitude
 * above what this program accepts, and the program stops on its own magnitude
 * band, which it names as its own and attributes to nothing.
 *
 * To show that the stop is driven by that note and not by a result written into
 * the code, this test changes the note, in memory, for the length of the test,
 * and checks that the decision changes the way it should. Its scope is narrow
 * on purpose: it also alters the model's proposal to match, so it establishes
 * that the engine follows the documentation it is handed, not that a model
 * would re-read the change on its own. The copy kept in data/ is never touched,
 * and the last case here proves it.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { fileOf } from "../src/lib/sources";
import { materialFor, runOne } from "../src/lib/run";
import { clone, recorded, YEAR } from "./helpers";

const [run] = recorded("barcelona");
const { source } = fileOf(run.fileId);
const asPublished = runOne(run.fileId, run.proposal, YEAR);

const PUBLISHED_NOTE = "06.Valor = Consum elèctric en megawatt  hores";
const NOTE_ALTERED_FOR_THIS_TEST = "06.Valor = Consum elèctric en kilowatt  hores";

describe("as published", () => {
  it("stops on the magnitude check, and names it as the program's own band", () => {
    expect(asPublished.verdict).toBe("magnitude_check_failed");
    expect(asPublished.valueGwh).toBeNull();
    expect(asPublished.checks.find((c) => c.id === "magnitude_within_band")?.stops).toBe(true);
  });

  it("shows the total under the declared unit, the band and where the band comes from", () => {
    expect(asPublished.magnitude).not.toBeNull();
    expect(asPublished.magnitude!.unit).toBe("MWh");
    expect(asPublished.magnitude!.rawTotal).toBe(5_998_510_712);
    expect(asPublished.magnitude!.minGwh).toBe(100);
    expect(asPublished.magnitude!.maxGwh).toBe(100_000);
    expect(asPublished.magnitude!.origin).toContain("Set by us");
  });

  it("attributes the anomaly to nothing, and calls the published note no contradiction", () => {
    // The two published statements are compatible: a figure can be in megawatt
    // hours and describe this city. What failed is a band this program chose.
    expect(asPublished.statement).toContain("a band of its own and not the publisher's");
    expect(asPublished.statement).toContain("nothing here decides which");
    expect(asPublished.statement).not.toContain("contradiction");
    expect(asPublished.missingCondition).toContain("the unit read from the publisher's words");
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
  const result = execute(altered, material, { period: YEAR });

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
    const real = execute(altered, materialFor(source, altered.dialect.encoding), { period: YEAR });
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
