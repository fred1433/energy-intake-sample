/**
 * The model proposes, the code falsifies.
 *
 * Every claim in a proposal is checked against the material before the program
 * acts on it. These cases build proposals by hand to exercise each refusal.
 */
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { fileOf } from "../src/lib/sources";
import { materialFor, runOne } from "../src/lib/run";
import { clone, recorded } from "./helpers";

const [ghent] = recorded("ghent");
const { source } = fileOf(ghent.fileId);
const material = () => materialFor(source, ghent.proposal.dialect.encoding);

describe("a claim the material does not support", () => {
  it("a fabricated unit passage leaves the unit not established", () => {
    const p = clone(ghent.proposal);
    p.declaredUnit = "kWh";
    p.unitEvidence = { kind: "documentation", quote: "All values in this table are expressed in kWh." };
    p.citations = [...p.citations, { quote: p.unitEvidence.quote!, where: "documentation", supports: "the unit" }];
    const result = execute(p, material());
    expect(result.verdict).toBe("insufficient_information");
    expect(result.missingCondition).toContain("the unit of");
    expect(result.passages.some((q) => !q.located)).toBe(true);
  });

  it("a fabricated additivity passage stops the aggregation", () => {
    const p = clone(ghent.proposal);
    p.declaredUnit = "kWh";
    p.unitEvidence = { kind: "documentation", quote: "Het totaal van het aantal toegangspunten" };
    p.rowSemanticsEvidence = { quote: "Each row carries the consumption of its own quarter." };
    const result = execute(p, material());
    expect(result.verdict).toBe("insufficient_information");
    expect(result.checks.find((c) => c.id === "rows_are_additive")?.outcome).toBe("fail");
  });

  it("a column that is not in the file is named back", () => {
    const p = clone(ghent.proposal);
    p.valueColumns = ["consumption_kwh"];
    const result = execute(p, material());
    expect(result.verdict).toBe("insufficient_information");
    expect(result.missingCondition).toContain("consumption_kwh");
  });

  it("a filter value that never occurs is named back", () => {
    const p = clone(ghent.proposal);
    p.rowFilters = [...p.rowFilters, { column: "markt", equals: "Electricity" }];
    const result = execute(p, material());
    expect(result.verdict).toBe("insufficient_information");
    expect(result.missingCondition).toContain("markt = Electricity");
  });

  it("a wrong decimal mark shows up as a column that is not numeric", () => {
    const p = clone(ghent.proposal);
    p.dialect = { ...p.dialect, thousandsSeparator: "." };
    const result = execute(p, material());
    expect(result.checks.find((c) => c.id === "values_are_numbers")?.outcome).toBe("pass");
    const wrong = clone(ghent.proposal);
    wrong.dialect = { ...wrong.dialect, delimiter: "," };
    expect(execute(wrong, material()).verdict).toBe("insufficient_information");
  });
});

describe("a source that states everything except one thing", () => {
  const result = runOne(ghent.fileId, ghent.proposal);

  it("does the work it can and stops at the one condition that is missing", () => {
    expect(result.verdict).toBe("insufficient_information");
    expect(result.rowsRetained).toBe(1233);
    expect(result.rawTotal).toBeCloseTo(1_305_160_204.98, 2);
    expect(result.valueGwh).toBeNull();
  });

  it("names the question that settles it, and does not answer it", () => {
    expect(result.missingCondition).toContain("A statement, by the publisher, of the unit");
    expect(result.openQuestion.length).toBeGreaterThan(0);
  });

  it("added the rows, and did so on columns no line of this code knows", () => {
    const additive = result.checks.find((c) => c.id === "rows_are_additive");
    expect(additive?.by).toBe("code");
    expect(additive?.outcome).toBe("pass");
    // The whole correspondence is in a language this repository never writes.
    expect(ghent.proposal.valueColumns).toEqual(["afname"]);
    const filters = ghent.proposal.rowFilters.map((f) => `${f.column}=${f.equals}`);
    expect(filters).toContain("markt=Elektriciteit");
    expect(filters).toContain("richting=Afname");
  });
});
