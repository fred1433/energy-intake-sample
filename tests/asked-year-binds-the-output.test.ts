/**
 * THE YEAR ASKED FOR AND THE ROWS KEPT ARE TWO DIFFERENT THINGS.
 *
 * A correspondence can run perfectly and still answer another question. The
 * filters come from the model; the year comes from the operation; nothing makes
 * them the same. So the engine is handed the period that was asked for and
 * checks the kept rows against it, and a run on the wrong year must never leave
 * here wearing the label of the right one.
 *
 * The recorded proposals are untouched: each case below alters a copy.
 */
import { describe, expect, it } from "vitest";
import { execute } from "../src/lib/engine/execute";
import { exportRows, publicationOf, reconcile, report } from "../src/lib/report";
import { fileOf } from "../src/lib/sources";
import { materialFor } from "../src/lib/run";
import { clone, recorded, YEAR } from "./helpers";

const runs = recorded("vienna");
const { source } = fileOf(runs[0].fileId);
const material = () => materialFor(source, runs[0].proposal.dialect.encoding);

/** The same correspondence, pointed at a year the file really does publish. */
function onAnotherPublishedYear() {
  const p = clone(runs[0].proposal);
  p.rowFilters = p.rowFilters.map((f) => (f.equals === "2024" ? { ...f, equals: "2023" } : f));
  return p;
}

describe("a correspondence that selects a different year of the same file", () => {
  const result = execute(onAnotherPublishedYear(), material(), { period: YEAR });

  it("finds the row: the year exists, the filter is valid, nothing is broken", () => {
    expect(result.checks.find((c) => c.id === "filter_values_present")?.outcome).toBe("pass");
    expect(result.rowsRetained).toBe(1);
    expect(result.periodsObserved).toEqual(["2023"]);
  });

  it("is refused all the same, on the year the operation asked for", () => {
    const check = result.checks.find((c) => c.id === "period_matches_request");
    expect(check?.by).toBe("code");
    expect(check?.outcome).toBe("fail");
    expect(check?.stops).toBe(true);
    expect(result.verdict).toBe("out_of_scope");
  });

  it("produces no figure, and never writes the asked-for year over the one it read", () => {
    expect(result.valueGwh).toBeNull();
    expect(result.valueGj).toBeNull();
    expect(result.askedFor).toBe("2024");
    expect(result.statement).toContain("The operation asks for 2024");
    expect(result.statement).toContain('"2023"');
    expect(result.statement).toContain("nothing produced from these rows is labelled 2024 here");
    expect(result.headline).toContain("not 2024");
  });

  it("carries the mismatch into the export, where the year column is the one asked for", () => {
    const real = report().find((r) => r.def.id === "vienna")!;
    const executions = [result];
    const [row] = exportRows([
      {
        ...real,
        runs: [real.runs[0]],
        reconciliation: reconcile(executions),
        publication: publicationOf(executions, reconcile(executions)),
      },
    ]);
    expect(row.year).toBe("2024");
    expect(row.value_gwh).toBe("");
    expect(row.decision).toBe("out_of_scope");
    expect(row.reason).toContain("not 2024");
  });
});

describe("a correspondence with no period column at all", () => {
  it("cannot be checked against the year asked for, so it produces nothing", () => {
    const p = clone(runs[0].proposal);
    p.periodColumn = null;
    const result = execute(p, material(), { period: YEAR });
    expect(result.verdict).toBe("out_of_scope");
    expect(result.valueGwh).toBeNull();
    expect(result.checks.find((c) => c.id === "period_matches_request")?.outcome).toBe("fail");
  });
});

describe("sub-periods of the year asked for are filed under it", () => {
  it("accepts quarters and days of that year, and only of that year", () => {
    // The case that files one row per quarter is kept by this check and refused
    // further down, on what a row means, not on when it was filed.
    const amsterdam = recorded("amsterdam")[0];
    const result = execute(
      amsterdam.proposal,
      materialFor(fileOf(amsterdam.fileId).source, amsterdam.proposal.dialect.encoding),
      { period: YEAR },
    );
    expect(result.periodsObserved).toEqual(["2024-1", "2024-2", "2024-3", "2024-4"]);
    expect(result.checks.find((c) => c.id === "period_matches_request")?.outcome).toBe("pass");
    expect(result.verdict).toBe("out_of_scope");
    expect(result.checks.find((c) => c.id === "rows_are_additive")?.stops).toBe(true);
  });
});
