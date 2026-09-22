/**
 * The conversions this program is allowed to run, with their factors.
 *
 * A unit conversion is not a judgement call. 1 MWh is 3.6 GJ by definition of
 * the joule and the hour, and the program runs it and shows it. Refusing a
 * conversion out of caution would be an inability, not a precaution.
 *
 * What a conversion never does is make two different definitions the same. Two
 * publications can both be in GWh and still not measure the same thing; that is
 * decided elsewhere, on the perimeter, never here.
 */
import type { Unit } from "./types";

/** Joules in one unit. The whole table is anchored on this one line. */
const JOULES: Record<Unit, number> = {
  kWh: 3.6e6,
  MWh: 3.6e9,
  GWh: 3.6e12,
  TWh: 3.6e15,
  GJ: 1e9,
  TJ: 1e12,
};

export const KNOWN_UNITS = Object.keys(JOULES) as Unit[];

export function isUnit(value: string): value is Unit {
  return Object.prototype.hasOwnProperty.call(JOULES, value);
}

export function factor(from: Unit, to: Unit): number {
  return JOULES[from] / JOULES[to];
}

export function convert(value: number, from: Unit, to: Unit): number {
  return value * factor(from, to);
}

/** The factor written out, so a reader can check it without running anything. */
export function statement(from: Unit, to: Unit): string {
  const f = factor(from, to);
  const shown = f >= 1e-9 && f < 1e9 ? trim(f) : f.toExponential(6);
  return `1 ${from} = ${shown} ${to}`;
}

function trim(n: number): string {
  return Number(n.toPrecision(12)).toString();
}
