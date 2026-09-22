/**
 * The only file in this repository that calls a model. Server side only.
 *
 * One call. The model reads a description of the file and the publisher's
 * documentation, and answers with a correspondence proposal in a fixed shape.
 * The model name comes from the environment, never from a literal here, and the
 * key never leaves the server.
 */
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Proposal } from "../engine/types";
import { request, SYSTEM } from "./prompt";

export const MAX_OUTPUT_TOKENS = 8000;

export class ModelNotConfigured extends Error {}
export class ProviderUnavailable extends Error {
  constructor(message: string, public status: number | null = null, public kind: string | null = null) {
    super(message);
    this.name = "ProviderUnavailable";
  }
}
export class ModelAnswerUnusable extends Error {}

const Unit = z.enum(["kWh", "MWh", "GWh", "TWh", "GJ", "TJ"]);

export const RawProposal = z.object({
  dialect: z.object({
    delimiter: z.string().describe('The character between fields, for example ";" or ",".'),
    decimalSeparator: z.enum([".", ","]),
    thousandsSeparator: z.enum([".", ",", " ", "none"]),
    encoding: z.enum(["utf-8", "utf-8-bom", "iso-8859-1", "windows-1252"]),
  }),
  rowFilters: z
    .array(z.object({ column: z.string(), equals: z.string() }))
    .describe("Rows kept for the operation, by exact match on a column value, written exactly as the file writes them. Include the year asked for when the file spans several years."),
  valueColumns: z
    .array(z.string())
    .describe("The column or columns carrying the quantity asked for. Several only when the publication splits that quantity into parts that make up the whole."),
  periodColumn: z
    .union([z.string(), z.null()])
    .describe("The column saying which period a row is filed under. When the file has several, the finest one, so that rows filed under different periods can be told apart."),
  declaredUnit: z.union([Unit, z.literal("not_declared")]),
  unitEvidence: z.object({
    kind: z.enum(["column", "documentation", "header_label", "not_declared"]),
    quote: z.union([z.string(), z.null()]).describe("Copied exactly from the material. Null when nothing states the unit."),
  }),
  unitColumn: z.union([z.string(), z.null()]).describe("Set only when the file carries the unit in a column of its own."),
  rowSemantics: z
    .enum(["its_own_slice", "repeats_a_quantity_other_rows_carry", "not_stated"])
    .describe(
      "The question is whether the kept rows may be added. Take one kept row: does any other kept row carry the same quantity again, rather than a different slice of it? A file that splits a year by area or by sector gives each row its own slice. A file that files one figure for a whole year under every period of that year repeats it.",
    ),
  rowSemanticsEvidence: z.object({ quote: z.union([z.string(), z.null()]) }),
  perimeter: z.string().describe("What the kept rows cover, in your own words, including what they leave out."),
  openQuestion: z.string().describe("The decision you are not taking in anyone's place."),
  citations: z.array(
    z.object({
      quote: z.string().describe("Copied exactly from the file or from the documentation you were given."),
      where: z.enum(["file", "documentation"]),
      supports: z.string(),
    }),
  ),
});

export type RawProposal = z.infer<typeof RawProposal>;

export interface ProposalResult {
  proposal: Proposal;
  usage: { model: string; inputTokens: number; outputTokens: number };
}

export async function propose(
  city: string,
  year: string,
  profileText: string,
  documentation: string,
): Promise<ProposalResult> {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new ModelNotConfigured("ANTHROPIC_MODEL is not set.");
  if (!process.env.ANTHROPIC_API_KEY) throw new ModelNotConfigured("ANTHROPIC_API_KEY is not set.");
  const client = new Anthropic();
  let response;
  try {
    response = await client.messages.parse({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: request(city, year, profileText, documentation) }],
      output_config: { format: zodOutputFormat(RawProposal) },
    });
  } catch (error) {
    // What the provider says can name the account: it stays in the server log.
    console.error("The proposal call failed.", error);
    if (error instanceof APIError) throw new ProviderUnavailable("The model provider did not answer.", error.status ?? null, error.name);
    throw new ProviderUnavailable("The model provider did not answer.", null, error instanceof Error ? error.name : null);
  }
  if (!response.parsed_output) {
    console.error("The proposal could not be read.", response.stop_reason);
    throw new ModelAnswerUnusable("The answer held nothing this program can read.");
  }
  return {
    proposal: response.parsed_output as Proposal,
    usage: {
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
