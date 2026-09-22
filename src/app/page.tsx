import { Rerun } from "@/components/Rerun";
import { Outcome, Quote, Trace, VerdictBadge } from "@/components/pieces";
import { SEMANTICS_LABEL, VERDICT_LABEL } from "@/lib/engine/verdicts";
import { exportRows, format, OPERATION, report } from "@/lib/report";

export default function Page() {
  const reports = report();
  const rows = exportRows(reports);
  const live = reports.find((r) => r.def.liveRerun)!;
  const others = reports.filter((r) => !r.def.liveRerun);
  const liveRun = live.runs[0];
  const liveSource = live.def.files[0];

  return (
    <main className="mx-auto w-full max-w-[1080px] px-6 sm:px-10">
      {/* ------------------------------------------------ the finished work */}
      <section className="pt-24 pb-28 sm:pt-32 sm:pb-36">
        <p className="eyebrow">The operation</p>
        <p className="mt-4 max-w-[640px] font-serif text-[17px] leading-[1.6] text-ink">{OPERATION}</p>

        <h1 className="mt-12 max-w-[820px] text-[44px] font-semibold leading-[1.04] tracking-[-0.028em] text-ink sm:text-[72px]">
          One figure, three refusals.
        </h1>

        <p className="mt-8 max-w-[620px] text-[17px] leading-[1.65] sm:text-[19px]">
          Four European cities publish their electricity consumption as open data. Asked for the same
          figure from each of them, for 2024, in GWh, this program produced one it could check against a
          second publication, and three exact reasons it would not produce the others.
        </p>

        <div className="mt-14 rounded-2xl bg-surface ring-1 ring-rule">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-rule">
                <th className="px-4 py-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-8">City</th>
                <th className="px-5 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-8">GWh</th>
                <th className="hidden px-5 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.12em] text-muted sm:table-cell sm:px-8">GJ</th>
                <th className="px-4 py-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-8">Decision</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(({ def, runs }, i) => {
                const e = runs[0].execution;
                return (
                  <tr key={def.id} className={i === 0 ? "" : "border-t border-rule-soft"}>
                    <td className="px-4 py-5 text-[15px] font-medium text-ink sm:px-8 sm:text-[16px]">
                      {def.city} <span className="font-normal text-muted">{def.year}</span>
                    </td>
                    <td className="px-4 py-5 text-right text-[15px] text-ink tnum sm:px-8 sm:text-[16px]">
                      {e.valueGwh === null ? <span className="whitespace-nowrap text-muted">not produced</span> : format(e.valueGwh)}
                    </td>
                    <td className="hidden px-4 py-5 text-right text-[16px] text-ink tnum sm:table-cell sm:px-8">
                      {e.valueGj === null ? "" : format(e.valueGj)}
                    </td>
                    <td className="px-4 py-5 sm:px-8">
                      <VerdictBadge verdict={e.verdict} short />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-b-2xl border-t border-rule bg-[#fafafb] px-5 py-5 sm:px-8">
            <p className="text-[13.5px] text-muted">
              {rows.length} rows, produced on 22 September 2026 from files downloaded the same day.
            </p>
            <a
              href="/export/electricity-2024.csv"
              className="text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              electricity-2024.csv
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {(["admissible", "out_of_scope", "documentary_contradiction", "insufficient_information"] as const).map(
            (v) => (
              <div key={v}>
                <p className="text-[14.5px] font-medium text-ink">{VERDICT_LABEL[v]}</p>
                <p className="mt-1 text-[14.5px] leading-[1.6]">{MEANING[v]}</p>
              </div>
            ),
          )}
        </div>

        <p className="mt-14 max-w-[620px] text-[15px] leading-[1.7]">
          A unit conversion is not a judgement call, so it runs and it is shown: 1 MWh = 3.6 GJ. What a
          conversion never does is make two different definitions the same, and no result here is
          compared with another city&rsquo;s, ranked or scored. A decision is about the operation, never
          about a publication or the people who produce it.
        </p>
      </section>

      {/* ------------------------------------------------ the chain, live */}
      <section className="border-t border-rule py-24 sm:py-32">
        <p className="eyebrow">The chain</p>
        <h2 className="mt-5 max-w-[760px] text-[32px] font-semibold leading-[1.1] tracking-[-0.022em] text-ink sm:text-[44px]">
          On a publication whose columns appear nowhere in this code.
        </h2>
        <p className="mt-8 max-w-[620px] text-[16px] leading-[1.7] sm:text-[17px]">
          No column name, no filter value and no city from this file is written anywhere in the program.
          A model read the publisher&rsquo;s own field descriptions, in Dutch, and proposed how the columns
          answer the operation. The program then checked what it could check. The button runs that first
          step again, now.
        </p>

        <div className="mt-14 space-y-12">
          <Link n={1} title="The publication, and what the publisher documents">
            <p className="text-[15.5px] leading-[1.7]">
              {liveSource.label}, published by {live.def.producer}. {live.def.language}. Downloaded on{" "}
              {live.def.retrievedAt} and kept in this repository with its checksum, together with the twelve
              field descriptions the publisher supplies beside it. Licence: {live.def.licence}.
            </p>
            <p className="mt-4 text-[14px]">
              <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={liveSource.url}>
                The file, at the publisher
              </a>
            </p>
          </Link>

          <Link n={2} title="What the model proposed">
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              <Field label="Value column" value={liveRun.run.proposal.valueColumns.join(" + ")} />
              <Field
                label="Rows kept"
                value={liveRun.run.proposal.rowFilters.map((f) => `${f.column} = ${f.equals}`).join("   ")}
              />
              <Field
                label="Unit, as the publisher declares it"
                value={
                  liveRun.run.proposal.declaredUnit === "not_declared"
                    ? "not declared anywhere"
                    : liveRun.run.proposal.declaredUnit
                }
              />
              <Field label="What a row carries" value={SEMANTICS_LABEL[liveRun.run.proposal.rowSemantics]} />
            </div>
            <p className="mt-7 text-[15.5px] leading-[1.7]">{liveRun.run.proposal.perimeter}</p>
            <div className="mt-7 space-y-5">
              {liveRun.execution.passages.slice(0, 2).map((p) => (
                <Quote key={p.quote} passage={p} />
              ))}
            </div>
            <div className="mt-10">
              <Rerun fileId={liveRun.run.fileId} />
            </div>
          </Link>

          <Link n={3} title="What the code executed, and where it stopped">
            <Trace checks={liveRun.execution.checks} />
          </Link>

          <Link n={4} title="What came out">
            <Outcome execution={liveRun.execution} />
            <p className="mt-5 text-[15.5px] leading-[1.7]">
              {liveRun.execution.rowsRetained.toLocaleString("en-GB")} rows of{" "}
              {liveRun.execution.rowsRead.toLocaleString("en-GB")} were kept and added. Their total is{" "}
              <span className="tnum font-medium text-ink">{format(liveRun.execution.rawTotal ?? 0)}</span> in the
              publisher&rsquo;s own unit. The row for this city is in the export above, with its value column empty.
            </p>
          </Link>

          <Link n={5} title={"The decision we did not take in anyone’s place"}>
            <p className="quote border-l-2 border-rule pl-4">{liveRun.execution.openQuestion}</p>
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ the other three */}
      <section className="border-t border-rule py-24 sm:py-32">
        <p className="eyebrow">The other three</p>
        <h2 className="mt-5 max-w-[760px] text-[32px] font-semibold leading-[1.1] tracking-[-0.022em] text-ink sm:text-[44px]">
          Same chain, same operation, three different answers.
        </h2>

        <div className="mt-14 space-y-16">
          {others.map(({ def, runs, agreement }) => {
            const e = runs[0].execution;
            return (
              <article key={def.id} className="grid gap-x-12 gap-y-6 lg:grid-cols-[200px_1fr]">
                <div>
                  <h3 className="text-[22px] font-semibold tracking-[-0.018em] text-ink">
                    {def.city} <span className="font-normal text-muted">{def.year}</span>
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">{def.producer}</p>
                </div>
                <div className="space-y-6">
                  <Outcome execution={e} />
                  {agreement ? (
                    <p className="rounded-xl bg-surface p-6 text-[15px] leading-[1.7] ring-1 ring-rule sm:p-7">
                      <span className="font-medium text-ink">Checked from outside the file. </span>
                      {agreement.statement} The second file splits the year by sector and is published
                      separately from the first; neither is derived from the other.
                    </p>
                  ) : null}
                  {e.passages.some((p) => !p.located) ? (
                    <div className="space-y-5">
                      {e.passages
                        .filter((p) => !p.located)
                        .map((p) => (
                          <Quote key={p.quote} passage={p} />
                        ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

      </section>

      {/* ------------------------------------------------ sources */}
      <footer className="border-t border-rule py-20">
        <p className="eyebrow">Sources</p>
        <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {reports.map(({ def }) => (
            <div key={def.id}>
              <p className="text-[15px] font-medium text-ink">
                {def.city} &middot; {def.producer}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-muted">
                {def.licence}. Retrieved {def.retrievedAt}.{" "}
                <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={def.licenceUrl}>
                  Licence
                </a>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-[640px] text-[14px] leading-[1.7] text-muted">
          Every file above is kept unchanged beside this page, with its checksum and the day it was
          downloaded, next to the engine, the recorded proposals and the tests.
        </p>
        <p className="mt-5 text-[14px]">
          <a
            className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            href="https://github.com/fred1433/energy-intake-sample"
          >
            github.com/fred1433/energy-intake-sample
          </a>
        </p>
      </footer>
    </main>
  );
}

const MEANING = {
  admissible: "The documented conditions the program checks are met. It delivers the value, its calculation and where it came from.",
  out_of_scope: "A known difference forbids this precise use. It delivers the difference, and the operation it did not run.",
  documentary_contradiction: "Two published statements about the same object cannot both hold. It delivers both passages, and invents no arbitration.",
  insufficient_information: "A necessary condition is not established. It delivers the missing field, and the question that settles it.",
} as const;

function Link({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-5 lg:grid-cols-[52px_1fr]">
      <p className="text-[15px] font-medium text-muted tnum lg:pt-1">{String(n).padStart(2, "0")}</p>
      <div>
        <h3 className="text-[20px] font-semibold tracking-[-0.016em] text-ink">{title}</h3>
        <div className="mt-6">{children}</div>
      </div>
    </section>
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
