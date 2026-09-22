/**
 * The one operation this program performs, and the one band it accepts a
 * result in. Stated here, once.
 */
import type { Unit } from "./types";

export const OPERATION =
  "Produce, for a given city and year, the annual electricity consumption of the territory, expressed in GWh, from an open municipal publication.";

export const TARGET_UNIT: Unit = "GWh";

/**
 * The magnitude band. It belongs to this program and to no publisher: it is a
 * rule we wrote, and a total outside it is a signal, not a fault found in
 * anybody's publication. What a total outside it means is left open on purpose,
 * because a magnitude anomaly alone cannot say whether the unit, the rows added
 * or the perimeter kept is the one to look at.
 */
export const BAND = {
  minGwh: 100,
  maxGwh: 100_000,
  origin:
    "Set by us, ten times wider on each side than every city total we measured ourselves before writing this program: the smallest was 1 287 GWh, the largest 12 197 GWh.",
};

/** How close two independently published figures must be to count as agreeing. */
export const CROSS_CHECK_TOLERANCE_GWH = 0.01;
