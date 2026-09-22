/**
 * THE HARDER ATTACK: A REAL PASSAGE, INVOKED FOR SOMETHING IT DOES NOT SAY.
 *
 * Catching a quote that is not in the material is necessary and easy. The next
 * problem is a quote that IS in the material, published word for word, offered
 * in support of a claim it never makes. Finding the words is not the words
 * saying it.
 *
 * Here only the unit justification is swapped: the additivity passage the
 * recorded proposal cites is kept as it is, so the aggregation still runs and
 * the operation reaches the unit step. The passage offered for the unit is a
 * real published field description, about how many access points a row
 * aggregates. It says nothing about kilowatt hours.
 *
 * What the code can answer is narrow, and the test holds it to exactly that: a
 * passage offered for a unit has to name that unit. That the passage is about
 * THIS column stays the model's reading, and no check here replaces it.
 */
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { namesUnit } from "../src/lib/engine/units";
import { fileOf } from "../src/lib/sources";
import { materialFor } from "../src/lib/run";
import { clone, recorded, YEAR } from "./helpers";

const [ghent] = recorded("ghent");
const { source } = fileOf(ghent.fileId);
const material = () => materialFor(source, ghent.proposal.dialect.encoding);

/** Published by the operator, word for word, about a different column. */
const REAL_BUT_UNRELATED =
  "Het totaal van het aantal toegangspunten waarvoor het verbruik geaggregeerd is";

function onlyTheUnitSwapped() {
  const p = clone(ghent.proposal);
  p.declaredUnit = "kWh";
  p.unitEvidence = { kind: "documentation", quote: REAL_BUT_UNRELATED };
  p.citations = [...p.citations, { quote: REAL_BUT_UNRELATED, where: "documentation", supports: "the unit" }];
  return p;
}

describe("the passage really is published", () => {
  it("is found in the material, character for character", () => {
    const result = execute(onlyTheUnitSwapped(), material(), { period: YEAR });
    expect(result.checks.find((c) => c.id === "passages_located")?.outcome).toBe("pass");
    expect(result.passages.every((q) => q.located)).toBe(true);
  });

  it("and the recorded additivity is kept, so the rows are still added", () => {
    const result = execute(onlyTheUnitSwapped(), material(), { period: YEAR });
    expect(result.checks.find((c) => c.id === "additivity_passage_located")?.outcome).toBe("pass");
    expect(result.checks.find((c) => c.id === "rows_added")?.outcome).toBe("pass");
    expect(result.rowsRetained).toBe(1233);
  });
});

describe("and it is still refused for the unit", () => {
  const result = execute(onlyTheUnitSwapped(), material(), { period: YEAR });

  it("does not establish the unit, and stops there", () => {
    const unit = result.checks.find((c) => c.id === "unit_declared");
    expect(unit?.by).toBe("code");
    expect(unit?.outcome).toBe("fail");
    expect(unit?.stops).toBe(true);
    expect(result.verdict).toBe("insufficient_information");
    expect(result.valueGwh).toBeNull();
  });

  it("says why: the passage is published and never names the unit", () => {
    const unit = result.checks.find((c) => c.id === "unit_declared");
    expect(unit?.detail).toContain("never names kWh");
    expect(unit?.detail).not.toContain("not in the material");
  });

  it("reaches no reading step it has not earned", () => {
    // The model's reading of prose as a unit symbol is only ever shown once the
    // code has established that the passage names that unit.
    expect(result.checks.some((c) => c.id === "unit_symbol_read_from_prose")).toBe(false);
  });
});

describe("the check behind it, on its own", () => {
  it("accepts a passage that names the unit, as a symbol or as a word", () => {
    expect(namesUnit("06.Valor = Consum elèctric en megawatt  hores", "MWh")).toBe(true);
    expect(namesUnit("Schatting van het jaarverbruik in kWh (elektriciteit)", "kWh")).toBe(true);
    expect(namesUnit("Jaehrlicher Endenergieverbrauch in Wien nach Energietraegern in GWh", "GWh")).toBe(true);
  });

  it("refuses a passage that never names it, and does not confuse two units", () => {
    expect(namesUnit(REAL_BUT_UNRELATED, "kWh")).toBe(false);
    expect(namesUnit("06.Valor = Consum elèctric en megawatt  hores", "kWh")).toBe(false);
    expect(namesUnit("the sector code has 9 characters", "GJ")).toBe(false);
  });

  it("is not a semantic check, and the trace says so where it passes", () => {
    // The whole point: naming the unit is all the code claims to have checked.
    const p = clone(ghent.proposal);
    p.declaredUnit = "kWh";
    p.unitEvidence = {
      kind: "documentation",
      // Published, names kWh, and is about a different publication's column.
      quote: "De verbruiken werden geaggregeerd naar een kalenderjaar (01/jan-31/dec).",
    };
    expect(namesUnit(p.unitEvidence.quote!, "kWh")).toBe(false);
  });
});
