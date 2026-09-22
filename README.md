# energy-intake-sample

One operation, run against four open municipal energy publications.

> **The operation.** Produce, for a given city and year, the annual electricity
> consumption of the territory, expressed in GWh, from an open municipal publication.

Everything in this repository serves that one sentence: four publications downloaded on
22 September 2026 and kept here unchanged, the correspondence a model proposed for each of
them, the code that executed what it could check, and the tests.

The page that shows the result: <https://energy-intake.theaipipe.com>

## What came out

| City | 2024 | Decision |
|---|---|---|
| Vienna | **7 796.50 GWh** (28 067 400 GJ) | Admissible for the operation |
| Amsterdam | output withheld | Out of scope for this operation |
| Barcelona | output withheld | Magnitude check failed |
| Ghent | output withheld | Information insufficient |

One figure, put against a second publication that carries the same quantity and agrees to the
cent. Three outputs withheld, each naming the condition that stopped it.

- **Vienna.** Both files carry their unit in a column of their own, so no step here turns prose
  into a unit symbol. The second file, published separately by the same municipal office, splits
  the year by sector: `40.26 + 2 898.76 + 708.21 + 3 454.35 + 694.92 = 7 796.50 GWh`. The two
  agree to the cent. That is a reconciliation between two publications, not an independent
  measurement, and nothing here establishes that their production chains share no step.
- **Amsterdam.** The publisher documents the value column as an estimate of a whole year, derived
  at each quarterly reference date. The file carries one such estimate per quarter; the four 2024
  figures differ from one another by at most 0.9 per cent, and adding them gives 18 568.66 GWh,
  which counts the same restated figure four times. None of them is the quantity realised over the
  calendar year: each is that year restated at its own reference date. What is open is which of
  the two the operation wants, and at which reference date.
- **Barcelona.** The published field description gives the unit as megawatt hours. Read that way,
  the year totals 5 998 510 712 MWh, which is 5 998 510.71 GWh, outside the 100 to 100 000 GWh
  band this program accepts. **That band is ours, not the publisher's.** The two published
  statements, the unit and what the table describes, are perfectly compatible: a figure can be in
  megawatt hours and describe this city. So the program reports a magnitude check failure, shows
  the total, the band and where the band comes from, and attributes the anomaly to nothing. A
  magnitude anomaly alone cannot say whether the unit, the aggregation or the perimeter is the one
  to look at.
- **Ghent.** Everything is established except one thing: none of the twelve field descriptions the
  publisher supplies states the unit of the value column. The rows are kept and added, the total is
  given in the publisher's own unit, and the conversion to GWh is not executed. That is the *first*
  blocking condition, not the only one left: the file documents a volume taken off a distribution
  network, which is not on its own all the electricity a territory consumes, and this program did
  not establish that equivalence either.

## The two halves, and why they are kept apart

**A model proposes.** It is given a profile of the file produced by code, the file's first lines
copied exactly, and the publisher's own documentation. It never reads the whole file. It answers:
which columns carry the quantity, how the file is written, which rows to keep, what the publisher
declares about the unit, whether the rows may be added, and what it is not deciding. It quotes the
publisher's words for everything load-bearing.

**The code falsifies, then executes.** It looks for every quoted passage in the bytes kept here,
character for character. A passage it cannot find supports nothing: the claim it was offered for
falls back to "not established", and the page shows the quote struck through. Then it checks that
the named columns exist, that each filter value occurs, that the kept rows are filed under the year
the operation asked for, that the value column reads as numbers under the proposed dialect, that
the rows may be added, and that the unit is declared. It runs the conversions, which are not
judgement calls: `1 MWh = 3.6 GJ`, and it shows the factor. It ends on one of four answers.

| Answer | What it delivers |
|---|---|
| Admissible for the operation | The value, its calculation and where it came from |
| Out of scope for this operation | The difference between what the publication carries and what was asked for |
| Information insufficient | The first condition that blocked, and the question that settles it |
| Magnitude check failed | The total, the band, where the band comes from, and no attribution |

No result is compared with another city's, ranked, or scored. A decision here is about the
operation, never about a publication or the people who produce it.

## What the code checks, and what it does not

The code checks that a cited passage is published in the material kept here, and that a passage
offered in support of a unit names that unit. It does **not** check that the passage is about the
column the correspondence reads, that a passage about rows implies those rows do not overlap, or
that the perimeter kept is the perimeter asked for. Those stay the model's readings. They are
badged `model` in the trace, and they are what an engineer is left to approve.

The distinction is made three lines wide where the rows are added: the model proposes that a row
carries its own slice; the code finds the passage that reading rests on; the code adds the rows.
Three different facts, three different authors.

Two published figures for the same quantity are a **publication lock**, not a decoration: where a
case carries a second, separately published file, nothing is published until the two agree.
`tests/publication-lock.test.ts` makes them disagree and checks that the figure, the decision and
the export all stop claiming a checked success.

In the recorded runs, the code found one quoted passage that was not in the material: a line
reproducing the column description the code itself built for the model, rather than a line of the
publication. The problem is the provenance, not invented content. Nothing rested on it, so no
verdict changed. It is shown on the page, struck through.

## No source-specific column mapping is hardcoded in the execution engine

No city, no column name and no filter value from any publication appears in `src/lib/engine`.
`tests/engine-is-generic.test.ts` checks that word by word, and then checks the strong form of the
claim: rename every column in a file and in the proposal that reads it, and the engine reaches the
same answer. The catalogue in `src/lib/sources.ts` does name files, publishers and URLs, one of
which is pre-filtered on a municipality; that is a catalogue, and the engine never reads it.

This is what the page's one live button demonstrates. It runs the correspondence step again, now,
on the publication whose columns appear nowhere in the code, in a language the code never writes.
What comes back is labelled `New proposal, not published`: the figure, the table and the export
stay the recorded run.

## Layout

```
data/                 the four publications, unchanged, with MANIFEST.json (producer,
                      terms of reuse, URL, retrieval date, sha256) and the publisher's own
                      field documentation beside each one
src/lib/engine/       the operation, the units, the reader, the checks, the four answers
src/lib/report.ts     the publication lock, and the export
src/lib/ai/           the one file that calls a model
src/recorded/         what the model proposed, per publication, with its token counts
src/app/              the page, and the one route that can call a model again
tests/                99 cases
scripts/              record the proposals, write the export
```

## Running it

```bash
npm install
npm test          # 99 cases, no network, no model
npm run build
```

The live rerun needs `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and `DEMO_SPEND_LIMIT_USD` in
`.env.local`. Without them the page serves the recorded runs and the button says so. The model
identifier is never written in the code. Live runs are capped per day and per address, and a
breaker pauses them after three provider failures in a row.

`npm run record` asks the model again for every publication and rewrites `src/recorded`.

## The export

`public/export/electricity-2024.csv` carries, per row: the city, the year asked for, the value in
GWh and in GJ when one was published, the decision, the reason it was or was not published, a link
back to the evidence on the page, the publisher's URL for the file, and the day it was downloaded.
A row without a figure still says what would have to be settled, and where to look.

## Sources

| City | Producer | Terms |
|---|---|---|
| Vienna | Stadt Wien, Magistratsabteilung 20 (Energieplanung) | Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de) |
| Amsterdam | Gemeente Amsterdam, Datateam Stedelijke Ontwikkeling en Beheer, from Liander and Stedin network data | Access level, not a licence: [OPENBAAR](https://api.data.amsterdam.nl/v1/energieverbruik_mra/) |
| Barcelona | Ajuntament de Barcelona, Oficina Municipal de Dades, from the Datadis platform | Licence: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| Ghent | Fluvius, distribution network operator for Flanders | Licence: [Open data license - FLUVIUS](https://opendata.fluvius.be/p/licentieopendatafluvius) |

Amsterdam publishes `OPENBAAR` as the authorisation level of the table. That is an access level,
not an identified licence, and it is not presented as one here.

All four were downloaded on 22 September 2026. `data/MANIFEST.json` carries the exact URL, the
byte count and the sha256 of each file, and `tests/data-integrity.test.ts` checks that the copies
kept here still match.

## Licence

MIT for the code in this repository.

The files under `data/` are not covered by it. Each one keeps the terms of the office that
published it, named above and recorded per file in `data/MANIFEST.json` together with its
producer, its URL and the day it was downloaded.
