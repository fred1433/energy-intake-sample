/** The one button that calls a model cannot be run in a loop. */
import { beforeEach, describe, expect, it } from "vitest";
import {
  BREAKER_FAILURES,
  inspect,
  instanceDailyLimit,
  recordProviderFailure,
  recordProviderSuccess,
  resetLimits,
  takeLiveRun,
} from "../src/lib/limits";

beforeEach(() => resetLimits());

describe("the daily caps", () => {
  it("stops the instance at its cap", () => {
    const cap = instanceDailyLimit();
    for (let i = 0; i < cap; i += 1) takeLiveRun(`caller-${i}`);
    expect(takeLiveRun("another").allowed).toBe(false);
    expect(takeLiveRun("another").reason).toBe("instance_daily_cap");
  });

  it("stops one caller well before the instance cap", () => {
    let last = takeLiveRun("one");
    while (last.allowed) last = takeLiveRun("one");
    expect(last.reason).toBe("address_daily_cap");
    expect(takeLiveRun("two").allowed).toBe(true);
  });

  it("starts again at the top of the UTC day", () => {
    const monday = new Date("2026-09-22T23:59:00Z");
    takeLiveRun("one", monday);
    const tuesday = new Date("2026-09-23T00:01:00Z");
    expect(inspect(tuesday, "one").addressRemaining).toBe(inspect(tuesday, "never-seen").addressRemaining);
  });

  it("counts before the provider is called, not after", () => {
    const before = inspect().instanceRemaining;
    takeLiveRun("one");
    expect(inspect().instanceRemaining).toBe(before - 1);
  });
});

describe("the breaker", () => {
  it("pauses after three failures in a row and says until when", () => {
    for (let i = 0; i < BREAKER_FAILURES; i += 1) recordProviderFailure();
    const decision = takeLiveRun("one");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("paused_after_errors");
    expect(decision.pausedUntil).not.toBeNull();
  });

  it("forgets the failures as soon as one run comes back", () => {
    recordProviderFailure();
    recordProviderFailure();
    recordProviderSuccess();
    recordProviderFailure();
    expect(takeLiveRun("one").allowed).toBe(true);
  });

  it("lifts the pause once it is over", () => {
    const now = new Date("2026-09-22T10:00:00Z");
    for (let i = 0; i < BREAKER_FAILURES; i += 1) recordProviderFailure(now);
    expect(takeLiveRun("one", now).allowed).toBe(false);
    const later = new Date("2026-09-22T10:31:00Z");
    expect(takeLiveRun("one", later).allowed).toBe(true);
  });
});
