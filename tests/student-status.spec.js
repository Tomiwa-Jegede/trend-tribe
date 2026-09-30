// tests/student-status.spec.js — parseMatric must require exactly
// RUN/<DEPT>/<YY>/<NUM> with a numeric student number. Anything looser lets
// a bogus value through every isValidMatricFormat() gate in auth.controller.js.
import { test, expect } from "@playwright/test";
import path from "path";
import { createRequire } from "module";

const backendRequire = createRequire(path.join(__dirname, "..", "backend", "package.json"));
const { parseMatric } = backendRequire("./src/utils/studentStatus");

test.describe("parseMatric", () => {
  test("accepts a canonical RUN/DEPT/YY/NUM matric", () => {
    expect(parseMatric("RUN/CMP/24/17209")).toEqual({ entryYear: 2024, dept: "CMP", yearSeg: "24" });
  });

  test("tolerates case and surrounding whitespace, and uppercases dept", () => {
    expect(parseMatric("run/cmp/24/17209")).toEqual({ entryYear: 2024, dept: "CMP", yearSeg: "24" });
    expect(parseMatric("  Run/phs/22/11856  ")).toEqual({ entryYear: 2022, dept: "PHS", yearSeg: "22" });
  });

  test("maps the year segment across the 50-year pivot", () => {
    expect(parseMatric("RUN/CMP/24/17209").entryYear).toBe(2024);
    expect(parseMatric("RUN/CMP/99/17209").entryYear).toBe(1999);
  });

  test("rejects fewer than four segments", () => {
    // the original bug: "at least 3" let a matric with no student number pass
    expect(parseMatric("RUN/CMP/24")).toBeNull();
    expect(parseMatric("RUN/CMP")).toBeNull();
    expect(parseMatric("RUN")).toBeNull();
  });

  test("rejects an empty or trailing student-number segment", () => {
    expect(parseMatric("RUN/CMP/24/")).toBeNull();
    expect(parseMatric("RUN/CMP/24/   ")).toBeNull();
  });

  test("rejects an empty middle segment instead of collapsing the split", () => {
    // filter(Boolean) would have turned this into a valid-looking 4-part value
    expect(parseMatric("RUN//24/12345")).toBeNull();
    expect(parseMatric("/RUN/CMP/24/12345")).toBeNull();
  });

  test("rejects more than four segments", () => {
    expect(parseMatric("RUN/CMP/24/12345/9")).toBeNull();
  });

  test("requires the literal RUN prefix", () => {
    expect(parseMatric("X/Y/24/12345")).toBeNull();
    expect(parseMatric("FUT/CMP/24/12345")).toBeNull();
    expect(parseMatric("RUNCMP/24/12345")).toBeNull();
  });

  test("requires an all-digit student number", () => {
    expect(parseMatric("RUN/CMP/24/abc")).toBeNull();
    expect(parseMatric("RUN/CMP/24/12-abc")).toBeNull();
    expect(parseMatric("RUN/CMP/24/17209.5")).toBeNull();
  });

  test("requires a two-digit numeric year segment", () => {
    expect(parseMatric("RUN/CMP/2X/12345")).toBeNull();
    expect(parseMatric("RUN/CMP/2024/12345")).toBeNull();
  });

  test("rejects non-strings and empty input", () => {
    for (const bad of [null, undefined, "", "   ", 12345, {}, [], true]) {
      expect(parseMatric(bad)).toBeNull();
    }
  });

  test("keeps the alumni literal working — unchanged return shape", () => {
    expect(parseMatric("alumni")).toEqual({ entryYear: null, dept: null, alumniLiteral: true });
    expect(parseMatric("ALUMNI")).toEqual({ entryYear: null, dept: null, alumniLiteral: true });
    expect(parseMatric("  Alumni  ")).toEqual({ entryYear: null, dept: null, alumniLiteral: true });
  });
});
