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

/**
 * One call to a model, on one publication. What comes back is a new proposal,
 * and it is labelled as one: the table, the export and the figure above stay
 * the recorded run, whatever this returns. Two readings may differ, and the
 * page says which of them is the output of record.
 */
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
      setMessage("The run did not come back. The recorded output stays the one of record.");
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
          {state === "running" ? "Asking the model again..." : "Propose the correspondence again"}
        </button>
        <p className="max-w-[620px] text-[13px] leading-[1.6] text-muted">
          <span className="font-medium text-ink">Recorded output above.</span> This is one call to a model,
          capped per day, on the same profile and the same documentation as the recorded run, so its reading
          can differ. What comes back is a new proposal, and nothing on this page is republished from it.
        </p>
      </div>

      {message ? <p className="mt-5 text-[14px] text-[#8a5300]">{message}</p> : null}

      {answer ? (
        <div className="mt-8 rounded-xl bg-[#fbfaf7] p-6 ring-1 ring-[#efe8d8]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a5300]">
              New proposal, not published
            </p>
            <p className="text-[12.5px] text-muted tnum">
              {answer.usage.inputTokens.toLocaleString("en-GB")} tokens in,{" "}
              {answer.usage.outputTokens.toLocaleString("en-GB")} out
            </p>
          </div>
          <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">
            Just now, on the same file. The recorded output above, the table and the export are unchanged
            by this: nothing on this page is republished from a live run.
          </p>

          <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
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

          <div className="mt-7">
            <VerdictBadge verdict={answer.execution.verdict} />
            <p className="mt-3.5 text-[15px] leading-[1.7] text-ink">{answer.execution.statement}</p>
          </div>

          <details className="group mt-6">
            <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
              What the code checked on this proposal
            </summary>
            <div className="mt-5">
              <Trace checks={answer.execution.checks} />
            </div>
          </details>

          <p className="mt-6 text-[13px] leading-[1.6] text-muted">
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
      <p className="mt-1.5 font-mono text-[13px] leading-[1.6] text-ink">{value}</p>
    </div>
  );
}
