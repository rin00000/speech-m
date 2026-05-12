import { describe, expect, it } from "vitest";
import { chunkForInQuery } from "./blocked-source-urls";

describe("chunkForInQuery", () => {
  it("splits into chunks of max size", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(chunkForInQuery(items, 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  it("returns one chunk when length fits", () => {
    expect(chunkForInQuery(["x", "y"], 10)).toEqual([["x", "y"]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunkForInQuery([], 5)).toEqual([]);
  });

  it("throws when maxChunkSize < 1", () => {
    expect(() => chunkForInQuery(["a"], 0)).toThrow("maxChunkSize");
  });
});
