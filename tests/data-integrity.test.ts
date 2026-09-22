/** The inputs kept in this repository are the ones that were downloaded, unchanged. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CASES } from "../src/lib/sources";

const DATA = path.join(process.cwd(), "data");
const manifest = JSON.parse(readFileSync(path.join(DATA, "MANIFEST.json"), "utf-8"));

describe("the kept copies still match the manifest", () => {
  for (const source of manifest.sources) {
    for (const file of source.files) {
      it(`${file.path} is unchanged since ${source.retrievedAt}`, () => {
        const full = path.join(DATA, file.path);
        expect(existsSync(full)).toBe(true);
        const raw = readFileSync(full);
        const bytes = file.gzip ? gunzipSync(raw) : raw;
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
      });
    }
  }

  it("every source names its producer, its terms of reuse and the day it was fetched", () => {
    for (const source of manifest.sources) {
      expect(source.producer.length).toBeGreaterThan(0);
      // A licence and an access level are not the same thing, and the manifest
      // says which of the two a publisher actually gave.
      expect(["licence", "access"]).toContain(source.rights.kind);
      expect(source.rights.label.length).toBeGreaterThan(0);
      expect(source.rights.url.length).toBeGreaterThan(0);
      expect(source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("says nothing is a licence where the publisher only published an access level", () => {
    const byId = Object.fromEntries(
      manifest.sources.map((s: { id: string; rights: { kind: string } }) => [s.id, s.rights.kind]),
    );
    for (const caseDef of CASES) expect(caseDef.rights.kind).toBe(byId[caseDef.id]);
    expect(CASES.some((c) => c.rights.kind === "access")).toBe(true);
  });
});
