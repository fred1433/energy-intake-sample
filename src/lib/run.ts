/**
 * Putting one proposal and one publication through the engine.
 *
 * Nothing here decides anything either: it loads the bytes kept in this
 * repository, decodes them the way the proposal says the file is written, and
 * hands both to the engine, together with the period the operation asks for.
 */
import { crossCheck, execute } from "./engine/execute";
import { profile, renderProfile, sniffDelimiter } from "./engine/profile";
import { decode } from "./engine/table";
import type { Execution, Proposal } from "./engine/types";
import { CROSS_CHECK_TOLERANCE_GWH } from "./engine/operation";
import { fileOf, readBytes, readDocumentation, type SourceFile } from "./sources";

export function materialFor(source: SourceFile, encoding: Proposal["dialect"]["encoding"]) {
  return {
    fileText: decode(readBytes(source), encoding),
    documentation: readDocumentation(source),
  };
}

/**
 * The period is passed in, never read back out of the proposal: the whole point
 * of the check inside the engine is that the two can disagree.
 */
export function runOne(fileId: string, proposal: Proposal, period: string): Execution {
  const { source } = fileOf(fileId);
  return execute(proposal, materialFor(source, proposal.dialect.encoding), { period });
}

/**
 * What the model is shown. Not the file: a description of it produced by code,
 * its first lines copied exactly, and the publisher's own documentation.
 */
export function profileFor(fileId: string): { text: string; documentation: string } {
  const { source } = fileOf(fileId);
  const text = decode(readBytes(source), "utf-8-bom");
  return { text: renderProfile(profile(text, sniffDelimiter(text))), documentation: readDocumentation(source) };
}

export { crossCheck, CROSS_CHECK_TOLERANCE_GWH };
