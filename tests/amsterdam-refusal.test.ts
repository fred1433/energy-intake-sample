/**
 * The refusal that is worth more than a number.
 *
 * The value column is documented as an estimate of a whole year, and the file
 * files one such estimate per quarter. Adding the four gives four times the
 * year. The program does not add them, and says which condition is missing.
 */
import { describe, expect, it } from "vitest";
import { runOne } from "../src/lib/run";
import { recorded, YEAR } from "./helpers";

const [run] = recorded("amsterdam");
const result = runOne(run.fileId, run.proposal, YEAR);

describe("a source where a known difference forbids this use", () => {
  it("is out of scope for the operation, not a fault of the publication", () => {
    expect(result.verdict).toBe("out_of_scope");
    expect(result.statement).toContain("Aggregation not executed under this definition");
  });

  it("publishes no figure it did not establish", () => {
    expect(result.valueGwh).toBeNull();
    expect(result.valueGj).toBeNull();
  });

  it("names the choice that is actually left, not a field the documentation already carries", () => {
    // The publisher already documents this column as an annual estimate. What
    // is open is which quantity the operation wants, and at which reference date.
    expect(result.missingCondition).toContain("the one realised over 2024");
    expect(result.missingCondition).toContain("a figure restated for the period at a reference date");
    expect(result.missingCondition).toContain("a stated rule for choosing that reference date");
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

  it("does not claim that one of the four is the year", () => {
    // An annualised estimate is not the quantity realised over the year, however
    // close the four of them are to one another.
    expect(result.statement).toContain("None of them is therefore the quantity realised over the period");
    expect(result.statement).not.toContain("worth one of them");
  });

  it("splits the reading, the passage and the sum into three facts with their own author", () => {
    const reading = result.checks.find((c) => c.id === "rows_are_additive");
    const located = result.checks.find((c) => c.id === "additivity_passage_located");
    const added = result.checks.find((c) => c.id === "rows_added");
    expect(reading?.by).toBe("model");
    expect(reading?.outcome).toBe("fail");
    expect(located?.by).toBe("code");
    expect(located?.outcome).toBe("pass");
    expect(located?.detail).toContain("jaarverbruik");
    expect(added?.by).toBe("code");
    expect(added?.outcome).toBe("not_applicable");
    expect(result.passages.some((p) => p.located && p.quote.includes("jaarverbruik"))).toBe(true);
  });

  it("leaves the choice between the four restatements to the reader", () => {
    expect(result.statement).toContain("are not decided here");
    expect(result.openQuestion.length).toBeGreaterThan(0);
  });
});
