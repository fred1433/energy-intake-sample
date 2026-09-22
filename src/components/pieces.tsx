import type { Check, Execution, Passage, Verdict } from "@/lib/engine/types";
import { VERDICT_LABEL } from "@/lib/engine/verdicts";

const TONE: Record<Verdict, string> = {
  admissible: "bg-[#edf6f0] text-[#146c43] ring-[#cfe6da]",
  out_of_scope: "bg-[#fdf5e7] text-[#8a5300] ring-[#f0e0bf]",
  documentary_contradiction: "bg-[#fdefee] text-[#9b2226] ring-[#f2d6d4]",
  insufficient_information: "bg-[#f2f4f8] text-[#44506a] ring-[#dde2ea]",
};

export function VerdictBadge({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 ring-inset ${TONE[verdict]} ${className}`}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function Quote({ passage }: { passage: Passage }) {
  return (
    <figure className="border-l-2 border-rule pl-4">
      <blockquote className={`quote ${passage.located ? "" : "line-through decoration-[#c4483f]/50"}`}>
        {passage.quote}
      </blockquote>
      <figcaption className="mt-1.5 text-[12.5px] text-muted">
        {passage.located ? (
          <>
            Found in the {passage.where === "file" ? "file" : "publisher's documentation"} kept here.
          </>
        ) : (
          <span className="text-[#9b2226]">Not in the material. Supports nothing here.</span>
        )}
      </figcaption>
    </figure>
  );
}

function ByBadge({ by }: { by: Check["by"] }) {
  const label = by === "model" ? "model" : by === "code" ? "code" : "human";
  const tone =
    by === "model" ? "bg-[#f3f0fb] text-[#5b4a9c] ring-[#e0d9f3]" : "bg-[#eef2f8] text-[#3b5378] ring-[#d9e2ee]";
  return (
    <span className={`inline-flex w-[52px] justify-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone}`}>
      {label}
    </span>
  );
}

const MARK: Record<Check["outcome"], string> = {
  pass: "text-[#146c43]",
  fail: "text-[#9b2226]",
  not_applicable: "text-muted",
};

export function Trace({ checks }: { checks: Check[] }) {
  return (
    <ol className="space-y-4">
      {checks.map((check) => (
        <li key={check.id} className="flex gap-3.5">
          <span className="pt-0.5">
            <ByBadge by={check.by} />
          </span>
          <p className="min-w-0 flex-1 text-[14.5px] leading-[1.65]">
            <span className="font-medium text-ink">{check.label}</span>
            <span className={`mx-2 ${MARK[check.outcome]}`}>
              {check.outcome === "pass" ? "ran" : check.outcome === "fail" ? "stopped here" : "nothing to check"}
            </span>
            {check.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Outcome({ execution }: { execution: Execution }) {
  return (
    <div className="space-y-4">
      <VerdictBadge verdict={execution.verdict} />
      <p className="text-[15.5px] leading-[1.7] text-ink">{execution.statement}</p>
      {execution.missingCondition ? (
        <p className="text-[14.5px] leading-[1.65]">
          <span className="font-medium text-ink">What is missing: </span>
          {execution.missingCondition}
        </p>
      ) : null}
      {execution.incompatiblePassages.length === 2 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {execution.incompatiblePassages.map((p) => (
            <Quote key={p.quote} passage={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
