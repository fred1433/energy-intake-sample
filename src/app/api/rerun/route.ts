/**
 * The one call to a model on this site.
 *
 * It runs the correspondence step again on the single publication whose columns
 * appear nowhere in this code, then puts the fresh proposal through the same
 * engine as the recorded one. Under a daily cap and a breaker; when either
 * stops it, the recorded run stays on the page.
 */
import { NextResponse } from "next/server";
import {
  ModelAnswerUnusable,
  ModelNotConfigured,
  propose,
  ProviderUnavailable,
} from "@/lib/ai/propose";
import { inspect, LIMIT_SCOPE, recordProviderFailure, recordProviderSuccess, takeLiveRun } from "@/lib/limits";
import { profileFor, runOne } from "@/lib/run";
import { CASES } from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RECORDED_STAYS = "The recorded run stays on the page.";

function clientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "local").trim();
}

function liveConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL && process.env.DEMO_SPEND_LIMIT_USD);
}

export async function GET(request: Request) {
  return NextResponse.json({
    live: liveConfigured(),
    limits: inspect(new Date(), clientId(request)),
    scope: LIMIT_SCOPE,
  });
}

export async function POST(request: Request) {
  let body: { fileId?: unknown };
  try {
    body = (await request.json()) as { fileId?: unknown };
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  // Only the publication this page offers, and only the one it may run again.
  const caseDef = CASES.find((c) => c.liveRerun && c.files.some((f) => f.id === body.fileId));
  if (!caseDef) {
    return NextResponse.json(
      { error: "This page runs one publication again, the one it offers. Nothing else is read." },
      { status: 400 },
    );
  }
  const fileId = body.fileId as string;

  if (!liveConfigured()) {
    return NextResponse.json({ error: `Live runs are switched off on this deployment. ${RECORDED_STAYS}` }, { status: 503 });
  }

  const decision = takeLiveRun(clientId(request));
  if (!decision.allowed) {
    const paused = decision.reason === "paused_after_errors";
    return NextResponse.json(
      {
        error: paused
          ? `Live runs are paused after repeated provider errors, until ${decision.pausedUntil}. ${RECORDED_STAYS}`
          : decision.reason === "instance_daily_cap"
            ? `Today's live runs are used up. ${RECORDED_STAYS} The cap lifts at midnight UTC.`
            : `You have used your live runs for today. ${RECORDED_STAYS} The cap lifts at midnight UTC.`,
        limits: decision,
      },
      { status: paused ? 503 : 429, headers: { "Retry-After": paused ? "1800" : "3600" } },
    );
  }

  try {
    const { text, documentation } = profileFor(fileId);
    const { proposal, usage } = await propose(caseDef.city, caseDef.year, text, documentation);
    recordProviderSuccess();
    const execution = runOne(fileId, proposal, caseDef.year);
    return NextResponse.json({
      proposal,
      execution,
      // Token counts only: the page never names the model that ran.
      usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
      limits: inspect(new Date(), clientId(request)),
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ModelNotConfigured) {
      return NextResponse.json({ error: `Live runs are not configured on this deployment. ${RECORDED_STAYS}` }, { status: 503 });
    }
    if (error instanceof ProviderUnavailable) {
      recordProviderFailure();
      return NextResponse.json(
        { error: `The model provider did not answer. ${RECORDED_STAYS}`, detail: { status: error.status, kind: error.kind } },
        { status: 503, headers: { "Retry-After": "600" } },
      );
    }
    if (error instanceof ModelAnswerUnusable) {
      return NextResponse.json({ error: `The model answered with something this page could not read. ${RECORDED_STAYS}` }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: `Something went wrong on the server. ${RECORDED_STAYS}` }, { status: 500 });
  }
}
