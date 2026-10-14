import { describe, it, expect } from "vitest";
import { twoHandState } from "../lib/two-hand";
describe("two-hand expand trigger", () => {
  it("one hand never expands", () =>
    expect(twoHandState([{ x: 0.1, y: 0.5 }], false).expanded).toBe(false));
  it("no hands never expands", () => expect(twoHandState([], true).expanded).toBe(false));
  it("both hands on same side never expands", () =>
    expect(
      twoHandState(
        [
          { x: 0.05, y: 0.5 },
          { x: 0.45, y: 0.5 },
        ],
        false,
      ).expanded,
    ).toBe(false));
  it("hands apart on opposite sides expands", () =>
    expect(
      twoHandState(
        [
          { x: 0.2, y: 0.5 },
          { x: 0.8, y: 0.5 },
        ],
        false,
      ).expanded,
    ).toBe(true));
  it("hands close together collapses", () =>
    expect(
      twoHandState(
        [
          { x: 0.4, y: 0.5 },
          { x: 0.6, y: 0.5 },
        ],
        true,
      ).expanded,
    ).toBe(false));
});
