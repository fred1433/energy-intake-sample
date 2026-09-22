/**
 * The positive outcome, without which the rest proves nothing.
 *
 * One publication declares its unit in a column, so the code reads the unit
 * rather than interpreting words. A second file, published separately by the
 * same office, carries the same quantity split by sector. The two are compared.
 */
import { describe, expect, it } from "vitest";
import { crossCheck, runOne } from "../src/lib/run";
import { recorded, YEAR } from "./helpers";

const runs = recorded("vienna");
const carriers = runOne(runs[0].fileId, runs[0].proposal, YEAR);
const sectors = runOne(runs[1].fileId, runs[1].proposal, YEAR);

describe("a source whose conditions are met", () => {
  it("is admissible for the operation", () => {
    expect(carriers.verdict).toBe("admissible");
    expect(carriers.missingCondition).toBeNull();
  });

  it("produces the value the file publishes for the year asked for", () => {
    expect(carriers.rowsRetained).toBe(1);
    expect(carriers.valueGwh).toBe(7796.5);
  });

  it("reads the unit from the file rather than from prose", () => {
    const unit = carriers.checks.find((c) => c.id === "unit_declared");
    expect(unit?.outcome).toBe("pass");
    expect(unit?.by).toBe("code");
    expect(carriers.conversion?.fromUnit).toBe("GWh");
    // Where the unit is in a column, no step is left to the model's reading.
    expect(carriers.checks.some((c) => c.id === "unit_symbol_read_from_prose")).toBe(false);
  });

  it("shows the conversion into joules with its factor", () => {
    expect(carriers.conversion?.joules.statement).toBe("1 MWh = 3.6 GJ");
    expect(carriers.valueGj).toBe(28_067_400);
  });

  it("agrees with a second file published separately", () => {
    expect(sectors.verdict).toBe("admissible");
    expect(sectors.valueGwh).toBe(7796.5);
    const agreement = crossCheck(carriers.valueGwh!, sectors.valueGwh!);
    expect(agreement.agree).toBe(true);
    expect(agreement.difference).toBe(0);
  });

  it("keeps a passage it could not find out of the evidence", () => {
    // The model cited a reconstructed line of the file. The code looked for it,
    // did not find it, and says so. The decision rests on checks it ran itself.
    for (const passage of carriers.passages.concat(sectors.passages)) {
      if (!passage.located) expect(passage.quote.length).toBeGreaterThan(0);
    }
    const located = sectors.checks.find((c) => c.id === "passages_located");
    expect(located?.by).toBe("code");
  });
});
