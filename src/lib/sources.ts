/**
 * The four publications this sample runs on, and where their bytes live.
 *
 * This is a catalogue, not logic: it names files, publishers, licences and
 * retrieval dates. Nothing here decides anything about a publication. The
 * engine in src/lib/engine never reads this file.
 */
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface SourceFile {
  id: string;
  label: string;
  /** Relative to the data directory kept in this repository. */
  file: string;
  url: string;
  gzip: boolean;
  documentation: string;
  /** The publisher's own sentence saying what the table describes, copied verbatim. */
  objectPassage: { quote: string; where: "file" | "documentation" };
}

export interface CaseDef {
  id: string;
  city: string;
  year: string;
  language: string;
  producer: string;
  licence: string;
  licenceUrl: string;
  retrievedAt: string;
  files: SourceFile[];
  /**
   * True for the one publication whose columns appear nowhere in this
   * repository's code, and which the page can run again on demand.
   */
  liveRerun: boolean;
}

export const CASES: CaseDef[] = [
  {
    id: "vienna",
    city: "Vienna",
    year: "2024",
    language: "English headers, German decimal marks",
    producer: "Stadt Wien, Magistratsabteilung 20 (Energieplanung)",
    licence: "Creative Commons Attribution 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/deed.de",
    retrievedAt: "2026-09-22",
    files: [
      {
        id: "vienna-carriers",
        label: "Final energy by energy carrier",
        file: "vienna/endenergieenergietraeger2024.csv",
        url: "https://www.wien.gv.at/data/ogd/ma20/endenergieenergietraeger2024.csv",
        gzip: false,
        documentation: "vienna/documentation.txt",
        objectPassage: {
          quote: "Jaehrlicher Endenergieverbrauch in Wien nach Energietraegern in GWh",
          where: "documentation",
        },
      },
      {
        id: "vienna-sectors",
        label: "Electrical energy by sector",
        file: "vienna/elenergiesektoren2024.csv",
        url: "https://www.wien.gv.at/data/ogd/ma20/elenergiesektoren2024.csv",
        gzip: false,
        documentation: "vienna/documentation.txt",
        objectPassage: {
          quote: "Elektrische Energie in Wien nach Sektoren Wien",
          where: "documentation",
        },
      },
    ],
    liveRerun: false,
  },
  {
    id: "amsterdam",
    city: "Amsterdam",
    year: "2024",
    language: "Dutch",
    producer: "Gemeente Amsterdam, Datateam Stedelijke Ontwikkeling en Beheer, from Liander and Stedin network data",
    licence: "Published as OPENBAAR on the municipal API",
    licenceUrl: "https://api.data.amsterdam.nl/v1/energieverbruik_mra/",
    retrievedAt: "2026-09-22",
    files: [
      {
        id: "amsterdam-quarterly",
        label: "Gas and electricity by neighbourhood, by quarter",
        file: "amsterdam/gas_en_elektriciteit_kwartaal.csv.gz",
        url: "https://api.data.amsterdam.nl/v1/energieverbruik_mra/v4/gas_en_elektriciteit_kwartaal/?gemeente=AMSTERDAM&_format=csv",
        gzip: true,
        documentation: "amsterdam/documentation.txt",
        objectPassage: {
          quote: "Verbruiksdata gas en elektriciteit per kwartaal van de Metropoolregio Amsterdam.",
          where: "documentation",
        },
      },
    ],
    liveRerun: false,
  },
  {
    id: "barcelona",
    city: "Barcelona",
    year: "2024",
    language: "Catalan",
    producer: "Ajuntament de Barcelona, Oficina Municipal de Dades, from the Datadis platform",
    licence: "Creative Commons Attribution 4.0",
    licenceUrl: "http://creativecommons.org/licenses/by/4.0/",
    retrievedAt: "2026-09-22",
    files: [
      {
        id: "barcelona-2024",
        label: "Electricity by postal code, sector and time band, daily",
        file: "barcelona/2024_consum_electricitat_bcn.csv.gz",
        url: "https://opendata-ajuntament.barcelona.cat/data/dataset/d9479057-781f-42b4-85e6-721bd0284130/resource/6f3a256a-dba6-46ac-88a4-546b93cb46da/download",
        gzip: true,
        documentation: "barcelona/documentation.txt",
        objectPassage: {
          quote:
            "Daily electric cosumption by postal code, economic sector and time interval in the city of Barcelona",
          where: "documentation",
        },
      },
    ],
    liveRerun: false,
  },
  {
    id: "ghent",
    city: "Ghent",
    year: "2024",
    language: "Dutch",
    producer: "Fluvius, distribution network operator for Flanders",
    licence: "Open data license - FLUVIUS",
    licenceUrl: "https://opendata.fluvius.be/p/licentieopendatafluvius",
    retrievedAt: "2026-09-22",
    files: [
      {
        id: "ghent-sectors",
        label: "Consumption by statistical sector, with NACE sector",
        file: "ghent/verbruiksgegevens_per_statistische_sector_gent.csv.gz",
        url: "https://opendata.fluvius.be/api/explore/v2.1/catalog/datasets/1_06a-verbruiksgegevens-per-statistische-sector-met-nace-sector-en-nace-subsecto/exports/csv?where=gemeente%3D%22GENT%22&delimiter=%3B",
        gzip: true,
        documentation: "ghent/documentation.txt",
        objectPassage: {
          quote:
            "In this dataset, consumption data is aggregated by market (electricity/gas), direction (injection/off-take), statistical sector, NACE sector and NACE subsector.",
          where: "documentation",
        },
      },
    ],
    liveRerun: true,
  },
];

export const DATA_DIR = path.join(process.cwd(), "data");

export function caseOf(id: string): CaseDef {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`No case "${id}" in the catalogue.`);
  return found;
}

export function fileOf(id: string): { source: SourceFile; caseDef: CaseDef } {
  for (const caseDef of CASES) {
    const source = caseDef.files.find((f) => f.id === id);
    if (source) return { source, caseDef };
  }
  throw new Error(`No file "${id}" in the catalogue.`);
}

export function readBytes(source: SourceFile): Uint8Array {
  const raw = readFileSync(path.join(DATA_DIR, source.file));
  return source.gzip ? new Uint8Array(gunzipSync(raw)) : new Uint8Array(raw);
}

export function readDocumentation(source: SourceFile): string {
  return readFileSync(path.join(DATA_DIR, source.documentation), "utf-8");
}
