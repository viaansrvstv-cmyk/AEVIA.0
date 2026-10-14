import { describe, expect, it } from "vitest";
import { selectLatestNonNullObservation, worldBankIndicatorUrl } from "./world-bank";

describe("World Bank homicide observations", () => {
  it("selects the latest year with a reported value, not a newer null", () => {
    expect(
      selectLatestNonNullObservation([
        { date: "2024", value: null },
        { date: "2022", value: 2.4 },
        { date: "2023", value: 2.1 },
      ]),
    ).toEqual({ year: 2023, value: 2.1 });
  });

  it("returns no data when there are no non-null observations", () => {
    expect(selectLatestNonNullObservation([{ date: "2024", value: null }])).toBeNull();
    expect(selectLatestNonNullObservation(null)).toBeNull();
  });

  it("builds the official API URL for a three-letter ISO code", () => {
    expect(worldBankIndicatorUrl("ind")).toBe(
      "https://api.worldbank.org/v2/country/IND/indicator/VC.IHR.PSRC.P5?format=json&per_page=100",
    );
    expect(() => worldBankIndicatorUrl("India")).toThrow("three-letter country code");
  });
});
