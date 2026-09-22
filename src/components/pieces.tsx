import type { Check, Execution, Passage, Verdict } from "@/lib/engine/types";
import { VERDICT_LABEL, VERDICT_SHORT } from "@/lib/engine/verdicts";

const TONE: Record<Verdict, string> = {
  admissible: "bg-[#edf6f0] text-[#146c43] ring-[#cfe6da]",
  out_of_scope: "bg-[#fdf5e7] text-[#8a5300] ring-[#f0e0bf]",
  magnitude_check_failed: "bg-[#fdefee] text-[#9b2226] ring-[#f2d6d4]",
  insufficient_information: "bg-[#f2f4f8] text-[#44506a] ring-[#dde2ea]",
};

export function VerdictBadge({
  verdict,
  short = false,
  className = "",
}: {
  verdict: Verdict;
  /** Narrow screens get the short form of the same four answers. */
  short?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 sm:px-3 text-[12.5px] font-medium ring-1 ring-inset ${TONE[verdict]} ${className}`}
    >
      {short ? (
        <>
          <span className="sm:hidden">{VERDICT_SHORT[verdict]}</span>
          <span className="hidden sm:inline">{VERDICT_LABEL[verdict]}</span>
        </>
      ) : (
        VERDICT_LABEL[verdict]
      )}
    </span>
  );
}

/**
 * A cited passage. When the code could not find it in the material, it is shown
 * struck through and what it was offered for is said out loud: a passage that is
 * not there supports nothing, and whether that stops the operation depends on
 * what rested on it.
 */
export function Quote({ passage, blocking }: { passage: Passage; blocking?: boolean }) {
  // A long passage is drawn short and kept whole: the text served is the text
  // cited, character for character, however few lines of it are painted.
  const clamp = passage.quote.length > 220 ? "line-clamp-2" : "";
  return (
    <figure className="border-l-2 border-rule pl-4">
      <blockquote className={`quote ${clamp} ${passage.located ? "" : "line-through decoration-[#c4483f]/60"}`}>
        {passage.quote}
      </blockquote>
      <figcaption className="mt-1.5 text-[12.5px] leading-[1.55] text-muted">
        {passage.located ? (
          <>Found in the {passage.where === "file" ? "file" : "publisher&rsquo;s documentation"} kept here. Offered for: {passage.supports}</>
        ) : (
          <span className="text-[#9b2226]">
            Not in the material, so it supports nothing here. Offered for: {passage.supports}.{" "}
            {blocking
              ? "The decision rested on it, so the output is withheld."
              : "No decision rested on it, so no verdict changed."}
          </span>
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

/**
 * A failure is not the same thing as an arrest. Only the one check that ended
 * the operation says so; every other failure is local and is named as such.
 */
function mark(check: Check): { text: string; tone: string } {
  if (check.outcome === "not_applicable") return { text: "nothing to check", tone: "text-muted" };
  if (check.outcome === "pass") return { text: check.by === "model" ? "proposed" : "ran", tone: "text-[#146c43]" };
  if (check.stops) return { text: "stopped here", tone: "text-[#9b2226]" };
  return { text: "did not hold", tone: "text-[#8a5300]" };
}

export function Trace({ checks }: { checks: Check[] }) {
  return (
    <ol className="space-y-3.5">
      {checks.map((check) => {
        const m = mark(check);
        return (
          <li key={check.id} className="flex gap-3.5">
            <span className="pt-0.5">
              <ByBadge by={check.by} />
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-[1.6]">
              <span className="font-medium text-ink">{check.label}</span>
              <span className={`mx-2 ${m.tone}`}>{m.text}</span>
              {check.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** The numbers a magnitude check compared, and whose band it is. */
function MagnitudeBlock({ magnitude }: { magnitude: NonNullable<Execution["magnitude"]> }) {
  const n = (v: number) => v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return (
    <dl className="grid gap-x-8 gap-y-3 rounded-xl bg-[#fdf7f6] p-5 ring-1 ring-[#f2d6d4] sm:grid-cols-3">
      <div>
        <dt className="eyebrow">Total, under the declared unit</dt>
        <dd className="mt-1 text-[15px] text-ink tnum">
          {n(magnitude.rawTotal)} {magnitude.unit}
        </dd>
      </div>
      <div>
        <dt className="eyebrow">Which is</dt>
        <dd className="mt-1 text-[15px] text-ink tnum">{n(magnitude.gwh)} GWh</dd>
      </div>
      <div>
        <dt className="eyebrow">Band applied</dt>
        <dd className="mt-1 text-[15px] text-ink tnum">
          {n(magnitude.minGwh)} to {n(magnitude.maxGwh)} GWh
        </dd>
      </div>
      <div className="sm:col-span-3">
        <dt className="eyebrow">Where the band comes from</dt>
        <dd className="mt-1 text-[13.5px] leading-[1.6]">{magnitude.origin}</dd>
      </div>
    </dl>
  );
}

export function Outcome({ execution, label }: { execution: Execution; label?: string }) {
  return (
    <div className="space-y-3.5">
      <VerdictBadge verdict={execution.verdict} />
      <p className="text-[15px] leading-[1.7] text-ink">{execution.statement}</p>
      {execution.magnitude ? <MagnitudeBlock magnitude={execution.magnitude} /> : null}
      {execution.missingCondition ? (
        <p className="text-[14.5px] leading-[1.65]">
          <span className="font-medium text-ink">
            {label ?? (execution.verdict === "insufficient_information" ? "First blocking condition" : "What is missing")}:{" "}
          </span>
          {execution.missingCondition}
        </p>
      ) : null}
    </div>
  );
}
