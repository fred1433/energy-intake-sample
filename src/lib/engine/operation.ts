/**
 * The one operation this program performs, and the one band it accepts a
 * result in. Stated here, once.
 */
import type { Unit } from "./types";

export const OPERATION =
  "Produce, for a given city and year, the annual electricity consumption of the territory, expressed in GWh, from an open municipal publication.";

export const TARGET_UNIT: Unit = "GWh";

/**
 * The range in which this program accepts a result of the kind the operation
 * asks for. It is not a statement about any city: it is the width outside which
 * a produced quantity is not of the kind asked for, which in practice only ever
 * catches a unit read three orders of magnitude away from the published one.
 */
export const BAND = {
  minGwh: 100,
  maxGwh: 100_000,
  origin:
    "Ten times wider on each side than every city total we measured ourselves before writing this program: the smallest was 1 287 GWh, the largest 12 197 GWh.",
};

/** How close two independently published figures must be to count as agreeing. */
export const CROSS_CHECK_TOLERANCE_GWH = 0.01;
