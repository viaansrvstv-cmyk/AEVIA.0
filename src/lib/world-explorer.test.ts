import { describe, expect, it } from "vitest";
import {
  countryAt,
  localClock,
  quizScore,
  sunPosition,
  timeDifferenceHours,
  weatherCondition,
  type Country,
} from "./world-explorer";
import data from "../assets/world-countries.json";
const countries = data as Country[];
describe("World Explorer", () => {
  it("selects India from its real coordinates", () =>
    expect(countryAt(countries, 28.61, 77.21)?.code).toBe("IND"));
  it("selects Fiji on both sides of the antimeridian", () => {
    expect(countryAt(countries, -17.8, 178)?.code).toBe("FJI");
    expect(countryAt(countries, -16.8, -179.9)?.code).toBe("FJI");
  });
  it("does not select a country in the open ocean", () =>
    expect(countryAt(countries, 0, -140)).toBeUndefined());
  it("uses India's IANA timezone, including its half-hour offset", () =>
    expect(localClock(new Date("2026-10-12T00:00:00Z"), "Asia/Kolkata").time).toBe("05:30:00"));
  it("handles daylight saving in a real IANA timezone", () => {
    expect(localClock(new Date("2026-07-12T12:00:00Z"), "America/New_York").time).toBe("08:00:00");
    expect(localClock(new Date("2026-01-12T12:00:00Z"), "America/New_York").time).toBe("07:00:00");
  });
  it("uses 06:00 to 18:00 local time for the day indicator", () => {
    expect(localClock(new Date("2026-10-12T06:00:00Z"), "UTC").day).toBe(true);
    expect(localClock(new Date("2026-10-12T18:00:00Z"), "UTC").day).toBe(false);
  });
  it("decodes Open-Meteo rain rather than labelling it cloudy", () =>
    expect(weatherCondition(63)).toBe("Rain"));
  it("computes a stable sub-solar point", () => {
    const sun = sunPosition(new Date("2026-03-20T12:00:00Z"));
    expect(Math.abs(sun.latitude)).toBeLessThan(2);
    expect(Math.abs(sun.longitude)).toBeLessThan(3);
  });
  it("converts local time differences across the date line", () => {
    expect(
      timeDifferenceHours(new Date("2026-01-12T12:00:00Z"), "America/New_York", "Asia/Tokyo"),
    ).toBe(14);
  });
  it("rewards correct quiz answers and resets a miss", () => {
    expect(quizScore(true, 2, 8)).toEqual({ points: 182, nextStreak: 3 });
    expect(quizScore(false, 4, 8)).toEqual({ points: 0, nextStreak: 0 });
  });
});
