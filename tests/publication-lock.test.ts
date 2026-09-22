/**
 * THE RECONCILIATION IS A PUBLICATION LOCK, NOT A DECORATION.
 *
 * One case carries two files the same office publishes separately for the same
 * quantity. Computing their difference proves nothing on its own: what matters
 * is what happens when they stop agreeing. This test makes them disagree, in
 * memory, by dropping one of the columns the second file is added from, and
 * checks that nothing downstream still announces a checked success: not the
 * figure, not the decision, not the export.
 *
 * The published files are never touched. The last case here proves it.
 */
import { describe, expect, it } from "vitest";
import { exportRows, publicationOf, reconcile, report, type CaseReport } from "../src/lib/report";
import { runOne } from "../src/lib/run";
import { clone, recorded, YEAR } from "./helpers";

const asPublished = report().find((r) => r.def.id === "vienna")!;

/** The same case, with the second file added from four of its five columns. */
function disagreeing(): CaseReport {
  const runs = recorded("vienna");
  const broken = clone(runs[1].proposal);
  broken.valueColumns = broken.valueColumns.slice(0, -1);
  const executions = [
    runOne(runs[0].fileId, runs[0].proposal, YEAR),
    runOne(runs[1].fileId, broken, YEAR),
  ];
  const reconciliation = reconcile(executions);
  return {
    def: asPublished.def,
    runs: asPublished.runs.map((r, i) => ({ ...r, execution: executions[i] })),
    reconciliation,
    publication: publicationOf(executions, reconciliation),
  };
}

describe("as published, the two files agree", () => {
  it("publishes the figure, and says what it was put against", () => {
    expect(asPublished.publication.decision).toBe("admissible");
    expect(asPublished.publication.valueGwh).toBe(7796.5);
    expect(asPublished.reconciliation?.agree).toBe(true);
    expect(asPublished.reconciliation?.difference).toBe(0);
  });
});

describe("with the second file no longer agreeing", () => {
  const broken = disagreeing();

  it("both files still produce a figure, so the disagreement is the only difference", () => {
    expect(broken.runs[0].execution.verdict).toBe("admissible");
    expect(broken.runs[1].execution.verdict).toBe("admissible");
    expect(broken.runs[1].execution.valueGwh).not.toBe(broken.runs[0].execution.valueGwh);
    expect(broken.reconciliation?.agree).toBe(false);
  });

  it("publishes no figure, and no longer calls the case admissible", () => {
    expect(broken.publication.valueGwh).toBeNull();
    expect(broken.publication.valueGj).toBeNull();
    expect(broken.publication.decision).not.toBe("admissible");
    expect(broken.publication.decision).toBe("insufficient_information");
  });

  it("says out loud that a figure was produced and not published", () => {
    expect(broken.publication.withheld).toContain("did not publish it");
    expect(broken.publication.withheld).toContain("more than the 0.01 GWh this program treats as agreement");
    expect(broken.publication.withheld).toContain("Nothing here chooses between them");
  });

  it("carries the same thing into the export, with its reason", () => {
    const [row] = exportRows([broken]);
    expect(row.value_gwh).toBe("");
    expect(row.value_gj).toBe("");
    expect(row.decision).toBe("insufficient_information");
    expect(row.reason).toContain("did not publish it");
    expect(row.evidence).toContain("#vienna");
  });

  it("the interface reads the published figure, never the engine's", () => {
    // The page shows publication.valueGwh. The engine's own value survives in
    // the run, and is exactly what must not reach a reader as a checked result.
    expect(broken.runs[0].execution.valueGwh).toBe(7796.5);
    expect(broken.publication.valueGwh).toBeNull();
  });
});

describe("the kept copies", () => {
  it("are untouched, and the real case still publishes", () => {
    const again = report().find((r) => r.def.id === "vienna")!;
    expect(again.publication.valueGwh).toBe(7796.5);
    expect(again.publication.decision).toBe("admissible");
  });
});
