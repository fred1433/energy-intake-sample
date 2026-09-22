/**
 * Putting one proposal and one publication through the engine.
 *
 * Nothing here decides anything either: it loads the bytes kept in this
 * repository, decodes them the way the proposal says the file is written, and
 * hands both to the engine.
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
    objectPassage: source.objectPassage,
  };
}

export function runOne(fileId: string, proposal: Proposal): Execution {
  const { source } = fileOf(fileId);
  return execute(proposal, materialFor(source, proposal.dialect.encoding));
}

/** What the model is shown: a description produced by code, not the file itself. */
export function profileFor(fileId: string): { text: string; documentation: string } {
  const { source } = fileOf(fileId);
  const text = decode(readBytes(source), "utf-8-bom");
  return { text: renderProfile(profile(text, sniffDelimiter(text))), documentation: readDocumentation(source) };
}

export { crossCheck, CROSS_CHECK_TOLERANCE_GWH };
