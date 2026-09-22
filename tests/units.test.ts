import { describe, expect, it } from "vitest";
import { convert, factor, statement } from "../src/lib/engine/units";

describe("unit conversion runs and shows its factor", () => {
  it("converts one megawatt hour into 3.6 gigajoules", () => {
    expect(convert(1, "MWh", "GJ")).toBe(3.6);
    expect(statement("MWh", "GJ")).toBe("1 MWh = 3.6 GJ");
  });

  it("keeps the scale of the watt hour family", () => {
    expect(convert(1, "GWh", "MWh")).toBe(1000);
    expect(convert(1, "GWh", "kWh")).toBe(1_000_000);
    expect(convert(1, "TWh", "GWh")).toBe(1000);
    expect(factor("kWh", "GWh")).toBeCloseTo(1e-6, 15);
  });

  it("comes back to where it started", () => {
    const there = convert(7796.5, "GWh", "GJ");
    expect(there).toBe(28_067_400);
    expect(convert(there, "GJ", "GWh")).toBeCloseTo(7796.5, 9);
  });

  it("crosses the two families in both directions", () => {
    expect(convert(1, "TJ", "MWh")).toBeCloseTo(277.7777777778, 9);
    expect(convert(3.6, "GJ", "MWh")).toBeCloseTo(1, 12);
  });
});
