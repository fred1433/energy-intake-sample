/** Writes the normalised export the page offers. Run after recording. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { exportCsv, exportRows, report } from "../src/lib/report";

const csv = exportCsv(exportRows(report()));
const out = path.join(process.cwd(), "public", "export");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "electricity-2024.csv"), csv);
process.stdout.write(csv);
