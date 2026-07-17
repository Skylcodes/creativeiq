import { describe, it, expect } from "vitest";
import { parseCsv, stripFormula, assertCsvLimits } from "@/lib/outcomes/csv/parse";
import { hashCsvContent } from "@/lib/outcomes/csv/hash";

describe("stripFormula", () => {
  it("strips leading formula chars", () => {
    expect(stripFormula("=1+1")).toBe("1+1");
    expect(stripFormula("+123")).toBe("123");
    expect(stripFormula("-5")).toBe("5");
    expect(stripFormula("@cmd")).toBe("cmd");
  });
});

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const { headers, rows } = parseCsv("a,b\n1,2\n3,4\n");
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted commas", () => {
    const { rows } = parseCsv('a,b\n"1,2",3\n');
    expect(rows[0]).toEqual(["1,2", "3"]);
  });
});

describe("assertCsvLimits", () => {
  it("rejects too many rows", () => {
    expect(() => assertCsvLimits("x", 501)).toThrow(/500/);
  });
});

describe("hashCsvContent", () => {
  it("is stable", () => {
    expect(hashCsvContent("a")).toBe(hashCsvContent("a"));
    expect(hashCsvContent("a")).not.toBe(hashCsvContent("b"));
  });
});
