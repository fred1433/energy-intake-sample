"use client";

import { useState } from "react";
import type { Execution, Proposal } from "@/lib/engine/types";
import { SEMANTICS_LABEL } from "@/lib/engine/verdicts";
import { Trace, VerdictBadge } from "./pieces";

interface Answer {
  proposal: Proposal;
  execution: Execution;
  usage: { inputTokens: number; outputTokens: number };
  limits: { instanceRemaining: number; addressRemaining: number };
  ranAt: string;
}

export function Rerun({ fileId }: { fileId: string }) {
  const [state, setState] = useState<"idle" | "running">("idle");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setState("running");
    setMessage(null);
    try {
      const response = await fetch("/api/rerun", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "The run did not come back.");
        setAnswer(null);
      } else {
        setAnswer(payload as Answer);
      }
    } catch {
      setMessage("The run did not come back. The recorded run stays on the page.");
    } finally {
      setState("idle");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={run}
          disabled={state === "running"}
          className="rounded-lg bg-ink px-5 py-3 text-[14.5px] font-medium text-white transition hover:bg-[#23262d] disabled:opacity-55"
        >
          {state === "running" ? "Reading the file again..." : "Propose the correspondence again"}
        </button>
        <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-muted">
          One call to a model, on this publication only, capped per day. It reads the file from
          scratch, so its reading can differ from the recorded one. Where it does, the program runs the
          new reading and the trace names the published passage it rests on.
        </p>
      </div>

      {message ? <p className="mt-5 text-[14.5px] text-[#8a5300]">{message}</p> : null}

      {answer ? (
        <div className="mt-8 border-t border-rule pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">Just now, on the same file</p>
            <p className="text-[12.5px] text-muted tnum">
              {answer.usage.inputTokens.toLocaleString("en-GB")} tokens in,{" "}
              {answer.usage.outputTokens.toLocaleString("en-GB")} out
            </p>
          </div>

          <div className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <Field label="Value column" value={answer.proposal.valueColumns.join(" + ")} />
            <Field
              label="Rows kept"
              value={answer.proposal.rowFilters.map((f) => `${f.column} = ${f.equals}`).join("   ") || "no filter"}
            />
            <Field
              label="Unit, as the publisher declares it"
              value={answer.proposal.declaredUnit === "not_declared" ? "not declared anywhere" : answer.proposal.declaredUnit}
            />
            <Field label="What a row carries" value={SEMANTICS_LABEL[answer.proposal.rowSemantics]} />
          </div>

          <div className="mt-8">
            <VerdictBadge verdict={answer.execution.verdict} />
            <p className="mt-4 text-[15.5px] leading-[1.7] text-ink">{answer.execution.statement}</p>
          </div>

          <div className="mt-8">
            <Trace checks={answer.execution.checks} />
          </div>

          <p className="mt-8 text-[13px] text-muted">
            The decision it left open: {answer.proposal.openQuestion}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-mono text-[13.5px] leading-[1.6] text-ink">{value}</p>
    </div>
  );
}
