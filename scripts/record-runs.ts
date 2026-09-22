/**
 * Runs the model once per publication and writes what it proposed to
 * src/recorded. Run by hand, never by the page.
 *
 * The page serves these recordings and runs the engine over them at build time,
 * so that opening the page calls no model at all.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { CASES } from "../src/lib/sources";
import { profileFor } from "../src/lib/run";
import { propose } from "../src/lib/ai/propose";

async function main() {
  const only = process.argv[2];
  let inputTokens = 0;
  let outputTokens = 0;
  for (const caseDef of CASES) {
    if (only && caseDef.id !== only) continue;
    const runs = [];
    for (const source of caseDef.files) {
      const { text, documentation } = profileFor(source.id);
      process.stdout.write(`${source.id}: asking the model, ${text.length} characters of profile ... `);
      const { proposal, usage } = await propose(caseDef.city, caseDef.year, text, documentation);
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;
      process.stdout.write(`${usage.inputTokens} in, ${usage.outputTokens} out\n`);
      runs.push({ fileId: source.id, proposal, usage, recordedAt: new Date().toISOString() });
    }
    const out = path.join(process.cwd(), "src", "recorded", `${caseDef.id}.json`);
    writeFileSync(out, JSON.stringify({ caseId: caseDef.id, runs }, null, 2) + "\n");
    console.log(`  written ${out}`);
  }
  console.log(`\nTotals: ${inputTokens} input tokens, ${outputTokens} output tokens.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
