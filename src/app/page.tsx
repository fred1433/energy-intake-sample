import { Rerun } from "@/components/Rerun";
import { Outcome, Quote, Trace } from "@/components/pieces";
import type { Passage, Proposal } from "@/lib/engine/types";
import { SEMANTICS_LABEL, VERDICT_LABEL, VERDICT_MEANING, VERDICT_SHORT } from "@/lib/engine/verdicts";
import { exportRows, format, OPERATION, report, type CaseReport } from "@/lib/report";

const REPO = "https://github.com/fred1433/energy-intake-sample";

export default function Page() {
  const reports = report();
  const rows = exportRows(reports);

  // The finished work first: the one case that produced a figure, and that
  // carries a second, separately published file to put it against.
  const published = reports.find((r) => r.publication.valueGwh !== null)!;
  const withheld = reports.filter((r) => r !== published);
  const second = published.runs[1];

  // The chain, shown on the publication the page can run again on demand.
  const live = reports.find((r) => r.def.liveRerun)!;
  const liveRun = live.runs[0];
  const liveSource = live.def.files[0];
  const p = liveRun.run.proposal;

  const rejected = firstRejected(reports);

  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 sm:px-10">
      {/* ---------------------------------------------- screen 1: the finished work */}
      <section className="pt-8 pb-7 sm:pt-10 sm:pb-7">
        <p className="eyebrow">The operation</p>
        <p className="mt-3 max-w-[860px] font-serif text-[16px] leading-[1.5] text-ink">{OPERATION}</p>

        <h1 className="mt-6 max-w-[860px] text-[42px] font-semibold leading-[1.04] tracking-[-0.028em] text-ink sm:text-[64px]">
          Nothing here was guessed.
        </h1>

        <p className="mt-4 max-w-[760px] text-[17px] leading-[1.6] sm:text-[18px]">
          Four cities publish their electricity as open data. One came out as a figure this program could put
          against a second publication. Three came out as a named condition instead.
        </p>

        <div id={published.def.id} className="mt-7 rounded-2xl bg-surface p-5 ring-1 ring-rule sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow">
                Published &middot; {published.def.city} {published.def.year}
              </p>
              <p className="mt-1.5 text-[38px] font-semibold leading-none tracking-[-0.026em] text-ink tnum sm:text-[48px]">
                {format(published.publication.valueGwh!)}{" "}
                <span className="text-[21px] font-medium tracking-normal text-muted sm:text-[24px]">GWh</span>
              </p>
            </div>
            <p className="text-[14.5px] text-muted tnum">
              {format(published.publication.valueGj!)} GJ &middot; 1 MWh = 3.6 GJ
            </p>
          </div>

          <p className="mt-4 max-w-[860px] text-[15px] leading-[1.6] text-ink">
            {published.publication.reason} Same municipal office, two separate publications: a reconciliation,
            not an independent measurement.
          </p>

          <details className="group mt-3.5">
            <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
              Where the second figure comes from, and why nothing here had to be read as a unit
            </summary>
            <div className="mt-4 space-y-3.5 text-[14.5px] leading-[1.65]">
              <p>
                {second.label}, {second.execution.parts.length} columns of one row, added:{" "}
                <span className="tnum text-ink">
                  {second.execution.parts.map((part) => format(part.value)).join(" + ")} ={" "}
                  {format(second.execution.rawTotal ?? 0)} GWh
                </span>
                .
              </p>
              <p>
                Both files carry their unit in a column of their own, and every kept row declares GWh, so the
                code reads it instead of turning a sentence of prose into a symbol. The conversion that does
                run is not a judgement call: 1 MWh = 3.6 GJ, printed beside the result. A conversion never
                makes two different definitions the same, which is why the perimeter is settled before it and
                never by it.
              </p>
              <p className="text-muted">{published.def.notEstablished}</p>
            </div>
          </details>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl bg-surface ring-1 ring-rule">
          <table className="w-full border-collapse text-left">
            <tbody>
              {withheld.map(({ def, publication }, i) => (
                <tr key={def.id} id={def.id} className={i === 0 ? "" : "border-t border-rule-soft"}>
                  <td className="px-5 py-3.5 align-top text-[15px] font-medium text-ink sm:px-6">
                    <span className="whitespace-nowrap">
                      {def.city} <span className="font-normal text-muted">{def.year}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 align-top text-[14.5px] leading-[1.55] sm:px-6">
                    <span className="font-medium text-ink">Output withheld. </span>
                    {publication.reason.startsWith("First blocking condition")
                      ? publication.reason
                      : `${VERDICT_SHORT[publication.decision]}: ${lower(publication.reason)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule bg-[#fafafb] px-5 py-3 sm:px-6">
            <p className="text-[13px] leading-[1.5] text-muted">
              {rows.length} rows. Every one carries its decision, its reason and a link back to its evidence.
            </p>
            <a
              href="/export/electricity-2024.csv"
              className="text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              electricity-2024.csv
            </a>
          </div>
        </div>

        <p className="mt-5 max-w-[860px] text-[15px] leading-[1.6]">
          No result here is compared with another city&rsquo;s, ranked or scored. A decision is about the
          operation, never about a publication or the people who produce it.
        </p>

        <details className="group mt-3.5">
          <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
            Each withheld output in full, and what each decision means
          </summary>
          <div className="mt-7 space-y-9">
            {withheld.map(({ def, runs, publication }) => (
              <article key={def.id} className="grid gap-x-10 gap-y-3 lg:grid-cols-[180px_1fr]">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.016em] text-ink">
                    {def.city} <span className="font-normal text-muted">{def.year}</span>
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">{def.producer}</p>
                </div>
                <div className="space-y-3.5">
                  <Outcome execution={runs[0].execution} />
                  {publication.withheld ? (
                    <p className="text-[14.5px] leading-[1.6] text-ink">{publication.withheld}</p>
                  ) : null}
                  {def.notEstablished ? (
                    <p className="text-[14px] leading-[1.6] text-muted">{def.notEstablished}</p>
                  ) : null}
                </div>
              </article>
            ))}
            <div className="grid gap-x-10 gap-y-4 border-t border-rule pt-7 sm:grid-cols-2">
              {(Object.keys(VERDICT_MEANING) as (keyof typeof VERDICT_MEANING)[]).map((v) => (
                <div key={v}>
                  <p className="text-[14px] font-medium text-ink">{VERDICT_LABEL[v]}</p>
                  <p className="mt-1 text-[14px] leading-[1.55]">{VERDICT_MEANING[v]}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      {/* ---------------------------------------------- screen 2: how it was obtained */}
      <section className="border-t border-rule py-8">
        <p className="eyebrow">How it was obtained</p>
        <h2 className="mt-3 max-w-[900px] text-[28px] font-semibold leading-[1.1] tracking-[-0.022em] text-ink sm:text-[36px]">
          A proposal, then the conditions it survives.
        </h2>
        <p className="mt-5 max-w-[820px] text-[16px] leading-[1.6] sm:text-[16.5px]">
          No source-specific column mapping is hardcoded in the execution engine. A model is given a profile of
          the file built by code, its first lines copied exactly, and the publisher&rsquo;s own field descriptions,
          and proposes how the columns answer the operation. The code then checks what it can check, one
          condition at a time.
        </p>

        <div className="mt-6 space-y-4">
          <Link n={1} title="The publication, and what the publisher documents">
            <p className="text-[15px] leading-[1.6]">
              {liveSource.label}, {live.def.producer}. {live.def.language}. Kept here with its checksum and the
              twelve field descriptions published with it.{" "}
              <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={liveSource.url}>
                The file, at the publisher
              </a>
              .
            </p>
          </Link>

          <Link n={2} title="What the model proposed">
            <p className="text-[15px] leading-[1.6]">
              Value from <code className="font-mono text-[13.5px] text-ink">{p.valueColumns.join(" + ")}</code>,
              rows where{" "}
              <code className="font-mono text-[13.5px] text-ink">
                {p.rowFilters.map((f) => `${f.column} = ${f.equals}`).join(", ")}
              </code>
              . Unit, as declared: {p.declaredUnit === "not_declared" ? "nowhere" : p.declaredUnit}. A row
              carries {SEMANTICS_LABEL[p.rowSemantics]}.
            </p>
            <details className="group mt-2.5">
              <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
                The perimeter in the model&rsquo;s words, and the passages it quotes
              </summary>
              <div className="mt-4 space-y-4">
                <p className="text-[14.5px] leading-[1.65]">{p.perimeter}</p>
                {liveRun.execution.passages.slice(0, 3).map((passage) => (
                  <Quote key={passage.quote} passage={passage} blocking={blocks(liveRun.execution.checks, p, passage)} />
                ))}
              </div>
            </details>
          </Link>

          <Link n={3} title="What the code checked">
            <p className="text-[15px] leading-[1.6]">
              {liveRun.execution.checks.length} steps, in order, each naming who did it.{" "}
              {liveRun.execution.headline}
            </p>
            <details className="group mt-2.5">
              <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
                The whole trace, step by step
              </summary>
              <div className="mt-4">
                <Trace checks={liveRun.execution.checks} />
              </div>
            </details>
          </Link>

          <Link n={4} title="What came out">
            <p className="text-[15px] leading-[1.6]">
              {liveRun.execution.rowsRetained.toLocaleString("en-GB")} rows of{" "}
              {liveRun.execution.rowsRead.toLocaleString("en-GB")} kept and added:{" "}
              <span className="tnum font-medium text-ink">{format(liveRun.execution.rawTotal ?? 0)}</span> in the
              publisher&rsquo;s own unit, and no figure in GWh. The export row carries that reason instead.
            </p>
          </Link>

          <Link n={5} title="The decision this program did not take in anyone's place">
            <p className="quote line-clamp-2 border-l-2 border-rule pl-4">{liveRun.execution.openQuestion}</p>
          </Link>
        </div>

        <div className="mt-7 border-t border-rule pt-6">
          <Rerun fileId={liveRun.run.fileId} />
        </div>
      </section>

      {/* ---------------------------------------------- screen 3: what resists a bad proposal */}
      <section className="border-t border-rule py-8">
        <p className="eyebrow">What resists a bad proposal</p>
        <h2 className="mt-3 max-w-[900px] text-[28px] font-semibold leading-[1.1] tracking-[-0.022em] text-ink sm:text-[36px]">
          A proposal is a claim until the code has looked.
        </h2>

        <div className="mt-6 grid gap-x-12 gap-y-6 lg:grid-cols-2">
          <div>
            <h3 className="text-[16.5px] font-semibold tracking-[-0.014em] text-ink">Rejected evidence</h3>
            <p className="mt-2.5 text-[14.5px] leading-[1.6]">
              Every quoted passage is looked for in the bytes kept here, character for character. One recorded
              proposal cited this:
            </p>
            <div className="mt-3.5">
              <Quote passage={rejected.passage} blocking={rejected.blocking} />
            </div>
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
                Where it came from, and when a rejected passage does stop the output
              </summary>
              <p className="mt-3 text-[14.5px] leading-[1.6]">
                Not invented content: it reproduces the description of that column the code itself built for
                the model, rather than a line of the publication. The provenance is what is wrong, and a
                passage that is not in the material supports nothing either way. Here nothing rested on it, so
                no decision changed and the output stands. Where the rejected passage is the one a condition
                rests on, that condition falls back to not established and the output is withheld.{" "}
                <code className="font-mono text-[13px]">tests/falsification.test.ts</code> builds that case on
                purpose, and{" "}
                <code className="font-mono text-[13px]">tests/real-quote-wrong-claim.test.ts</code> builds the
                harder one: a passage that really is published, offered for something it never says.
              </p>
            </details>
          </div>

          <div>
            <h3 className="text-[16.5px] font-semibold tracking-[-0.014em] text-ink">
              A test that alters a published note
            </h3>
            <p className="mt-2.5 text-[14.5px] leading-[1.6]">
              One case stops on a magnitude check. To show the stop comes from the publisher&rsquo;s own field
              description and not from a result written into the code, one test changes that description in
              memory and the decision changes with it: the total lands inside the band and comes out.
            </p>
            <details className="group mt-2.5">
              <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
                Exactly what that test proves, and what it does not
              </summary>
              <p className="mt-3 text-[14.5px] leading-[1.6]">
                It also alters the model&rsquo;s proposal to match the altered note. So it establishes that the
                engine follows the documentation it is handed; it does not establish that a model would re-read
                the change on its own. The same test then offers the altered quote against the real
                documentation, where it is not found and establishes nothing, and checks the kept copy byte for
                byte afterwards.{" "}
                <code className="font-mono text-[13px]">tests/modified-unit-note.test.ts</code>
              </p>
            </details>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-[16.5px] font-semibold tracking-[-0.014em] text-ink">What no check here replaces</h3>
            <p className="mt-2.5 max-w-[880px] text-[14.5px] leading-[1.6]">
              The code checks that a cited passage is published, and that a passage offered for a unit names that
              unit. It does not check that the passage is about the column the correspondence reads, that a
              passage about rows implies those rows do not overlap, or that the perimeter kept is the one asked
              for. Those stay the model&rsquo;s readings, badged{" "}
              <span className="font-medium text-ink">model</span> in the trace, and they are what an engineer is
              left to approve. A magnitude anomaly says a total is outside a band we chose, and nothing about
              which of the three is the reason.
            </p>
            <p className="mt-3 text-[13.5px] text-muted">
              No network, no model call: <code className="font-mono text-[13px]">npm test</code>.{" "}
              <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={`${REPO}/tree/main/tests`}>
                The tests
              </a>
              ,{" "}
              <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={`${REPO}/tree/main/src/lib/engine`}>
                the engine
              </a>
              ,{" "}
              <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={`${REPO}/tree/main/src/recorded`}>
                what the model proposed
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- sources */}
      <footer className="border-t border-rule py-6">
        <p className="eyebrow">Sources</p>
        <div className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {reports.map(({ def }) => (
            <div key={def.id}>
              <p className="text-[12.5px] leading-[1.5] text-muted">
                <span className="font-medium text-ink">{def.city}</span>. {def.producer}.{" "}
                {def.rights.kind === "licence" ? "Licence" : "Access level, not a licence"}:{" "}
                <a className="underline decoration-rule underline-offset-4 hover:decoration-ink" href={def.rights.url}>
                  {def.rights.label}
                </a>
                . Retrieved {def.retrievedAt}.
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-[900px] text-[13px] leading-[1.6] text-muted">
          Each file is kept unchanged beside this page with its checksum, next to the engine, the recorded
          proposals and the tests.{" "}
          <a className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink" href={REPO}>
            github.com/fred1433/energy-intake-sample
          </a>
        </p>
      </footer>
    </main>
  );
}

/** The first passage, anywhere in the recorded runs, that the code could not find. */
function firstRejected(reports: CaseReport[]): { city: string; passage: Passage; blocking: boolean } {
  for (const { def, runs } of reports) {
    for (const { run, execution } of runs) {
      const passage = execution.passages.find((q) => !q.located);
      if (passage) {
        return { city: def.city, passage, blocking: blocks(execution.checks, run.proposal, passage) };
      }
    }
  }
  throw new Error("The page describes a rejected passage. There is none in the recorded runs.");
}

/** Did the operation stop because this passage was not found? */
function blocks(checks: { id: string; stops: boolean }[], proposal: Proposal, passage: Passage): boolean {
  if (passage.located) return false;
  const stopped = checks.find((c) => c.stops)?.id;
  if (stopped === "unit_declared") return proposal.unitEvidence.quote === passage.quote;
  if (stopped === "additivity_passage_located") return proposal.rowSemanticsEvidence.quote === passage.quote;
  return false;
}

function lower(sentence: string): string {
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

function Link({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-7 gap-y-2 lg:grid-cols-[40px_1fr]">
      <p className="text-[14px] font-medium text-muted tnum lg:pt-0.5">{String(n).padStart(2, "0")}</p>
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.016em] text-ink">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </section>
  );
}
