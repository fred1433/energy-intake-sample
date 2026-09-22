/**
 * The refusal that is worth more than a number.
 *
 * The value column is documented as an estimate of a whole year, and the file
 * files one such estimate per quarter. Adding the four gives four times the
 * year. The program does not add them, and says which condition is missing.
 */
import { describe, expect, it } from "vitest";
import { runOne } from "../src/lib/run";
import { recorded } from "./helpers";

const [run] = recorded("amsterdam");
const result = runOne(run.fileId, run.proposal);

describe("a source where a known difference forbids this use", () => {
  it("is out of scope for the operation, not a fault of the publication", () => {
    expect(result.verdict).toBe("out_of_scope");
    expect(result.statement).toContain("Aggregation not executed under this definition");
  });

  it("publishes no figure it did not establish", () => {
    expect(result.valueGwh).toBeNull();
    expect(result.valueGj).toBeNull();
  });

  it("names the condition that is missing", () => {
    expect(result.missingCondition).toBe(
      "A field, in the publication, that distinguishes the consumption of a period from a figure restated for the whole year.",
    );
  });

  it("shows the four figures, how close they are, and what adding them would have given", () => {
    for (const quarterly of ["4,617.2", "4,642.69", "4,650.13", "4,658.63"]) {
      expect(result.statement).toContain(quarterly);
    }
    // Four figures within one per cent of each other is what a year restated
    // four times looks like, and the code measures it rather than asserting it.
    expect(result.statement).toContain("at most 0.9 per cent");
    expect(result.statement).toContain("18,568.66");
  });

  it("refuses on a quote the code found in the publisher's own documentation", () => {
    const additive = result.checks.find((c) => c.id === "rows_are_additive");
    expect(additive?.by).toBe("code");
    expect(additive?.outcome).toBe("fail");
    expect(additive?.detail).toContain("jaarverbruik");
    expect(result.passages.some((p) => p.located && p.quote.includes("jaarverbruik"))).toBe(true);
  });

  it("leaves the choice between the four restatements to the reader", () => {
    expect(result.statement).toContain("are not decided here");
    expect(result.openQuestion.length).toBeGreaterThan(0);
  });
});
