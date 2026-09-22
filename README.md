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
| Amsterdam | not produced | Out of scope for this operation |
| Barcelona | not produced | Documentary contradiction |
| Ghent | not produced | Information insufficient |

One figure, checked against a second publication that carries the same quantity and agrees
to the cent. Three refusals, each naming what is missing.

- **Amsterdam.** The value column is documented as an estimate of a whole year, and the file
  files one such estimate per quarter. The four 2024 figures differ from one another by at
  most 0.9 per cent; adding them gives 18 568.66 GWh for a year the publication says is worth
  one of them. The program does not add them, and does not pick one either.
- **Barcelona.** The published field description gives the unit as megawatt hours. Read that
  way, the year comes out at 5 998 511 GWh, which is not a quantity of the kind the operation
  asks for. The program reproduces the field description and the publisher's own description
  of what the table covers, and invents no arbitration between them.
- **Ghent.** Everything is established except one thing: none of the twelve field descriptions
  the publisher supplies states the unit of the value column. The rows are kept and added, the
  total is given in the publisher's own unit, and the conversion to GWh is not executed.

## The two halves, and why they are kept apart

**A model proposes.** Given a description of the file produced by code, and the publisher's own
documentation, it answers: which columns carry the quantity, how the file is written, which rows
to keep, what the publisher declares about the unit, whether the rows may be added, and what it
is not deciding. It quotes the publisher's words for everything load-bearing.

**The code falsifies, then executes.** It looks for every quoted passage in the bytes kept here,
character for character. A passage it cannot find supports nothing: the claim it was offered for
falls back to "not established", and the page shows the quote struck through. Then it checks that
the named columns exist, that each filter value occurs, that the value column reads as numbers
under the proposed dialect, that the rows may be added, and that the unit is declared. It runs the
conversions, which are not judgement calls: `1 MWh = 3.6 GJ`, and it shows the factor. It ends on
one of four answers.

| Answer | What it delivers |
|---|---|
| Admissible for the operation | The value, its calculation and where it came from |
| Out of scope for this operation | The known difference, and the operation it did not run |
| Information insufficient | The missing field, and the question that settles it |
| Documentary contradiction | Both passages, with no arbitration invented |

No result is compared with another city's, ranked, or scored. A decision here is about the
operation, never about a publication or the people who produce it.

In the recorded runs, the code found two quoted passages that were not in the material: a line of
a file the model had reconstructed rather than copied, and a fragment in a shape the file does not
use. Neither supported a condition the decision rested on, so neither verdict changed. Both are
shown on the page, struck through.

## The engine knows nothing about these four files

No city, no column name and no filter value from any publication appears in `src/lib/engine`.
`tests/engine-is-generic.test.ts` checks that word by word, and then checks the strong form of the
claim: rename every column in a file and in the proposal that reads it, and the engine reaches the
same answer.

This is what the page's one live button demonstrates. It runs the correspondence step again, now,
on the publication whose columns appear nowhere in the code, in a language the code never writes.

## Layout

```
data/                 the four publications, unchanged, with MANIFEST.json (producer,
                      licence, URL, retrieval date, sha256) and the publisher's own
                      field documentation beside each one
src/lib/engine/       the operation, the units, the reader, the checks, the four answers
src/lib/ai/           the one file that calls a model
src/recorded/         what the model proposed, per publication, with its token counts
src/app/              the page, and the one route that can call a model again
tests/                75 cases
scripts/              record the proposals, write the export
```

## Running it

```bash
npm install
npm test          # 75 cases, no network, no model
npm run build
```

The live rerun needs `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and `DEMO_SPEND_LIMIT_USD` in
`.env.local`. Without them the page serves the recorded runs and the button says so. The model
identifier is never written in the code. Live runs are capped per day and per address, and a
breaker pauses them after three provider failures in a row.

`npm run record` asks the model again for every publication and rewrites `src/recorded`.

## Sources

| City | Producer | Licence |
|---|---|---|
| Vienna | Stadt Wien, Magistratsabteilung 20 (Energieplanung) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de) |
| Amsterdam | Gemeente Amsterdam, Datateam Stedelijke Ontwikkeling en Beheer, from Liander and Stedin network data | [OPENBAAR](https://api.data.amsterdam.nl/v1/energieverbruik_mra/) |
| Barcelona | Ajuntament de Barcelona, Oficina Municipal de Dades, from the Datadis platform | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| Ghent | Fluvius, distribution network operator for Flanders | [Open data license - FLUVIUS](https://opendata.fluvius.be/p/licentieopendatafluvius) |

All four were downloaded on 22 September 2026. `data/MANIFEST.json` carries the exact URL, the
byte count and the sha256 of each file, and `tests/data-integrity.test.ts` checks that the copies
kept here still match.

## Licence

MIT for the code in this repository.

The files under `data/` are not covered by it. Each one keeps the licence of the office that
published it, named above and recorded per file in `data/MANIFEST.json` together with its
producer, its URL and the day it was downloaded.
