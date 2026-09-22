/** What the model is asked, and nothing more. */
import { OPERATION } from "../engine/operation";

export const SYSTEM = `You read one open data publication and propose how its columns answer one operation.

${OPERATION}

You propose. A program then checks what it can check and refuses the rest. So say what the publication says, and say plainly when it does not say something. Quote the publisher's own words, copied exactly from the material you are given, for the unit and for what a row covers in time; a quote the program cannot find in the material supports nothing.

End with the decision you are not taking in anyone's place.`;

export function request(city: string, year: string, profileText: string, documentation: string): string {
  return `City: ${city}
Year asked for: ${year}

${profileText}

The documentation the publisher supplies with this file, copied verbatim:
"""
${documentation}
"""`;
}
