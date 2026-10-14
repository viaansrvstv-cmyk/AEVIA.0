import { describe, expect, it } from "vitest";
import {
  achievementFor,
  averageBrightness,
  moodFromSignals,
  roomReport,
  rmsVolume,
  smoothValue,
} from "./room-reader";

describe("room reader signal utilities", () => {
  it("calculates average perceptual brightness from pixels", () => {
    expect(averageBrightness([255, 255, 255, 255, 0, 0, 0, 255])).toBeCloseTo(50, 1);
    expect(averageBrightness([])).toBe(0);
  });

  it("calculates RMS volume as a 0–100 value", () => {
    expect(rmsVolume([128, 128, 128, 128])).toBe(0);
    expect(rmsVolume([0, 255, 0, 255])).toBeGreaterThan(90);
  });

  it("smooths without jumping straight to the new value", () => {
    expect(smoothValue(10, 90, 0.2)).toBe(26);
  });

  it("classifies dim, crowded and lively rooms", () => {
    expect(moodFromSignals({ light: 10, sound: 50, people: 20 }).label).toBe("Dim");
    expect(moodFromSignals({ light: 70, sound: 45, people: 100 }).label).toBe("Crowded");
    expect(moodFromSignals({ light: 90, sound: 75, people: 35 }).label).toBe("Lively");
  });

  it("summarises a room report and finds the calmest minute", () => {
    const report = roomReport([
      { light: 40, sound: 20, people: 20, mood: 30, at: 60_000 },
      { light: 60, sound: 80, people: 40, mood: 70, at: 61_000 },
      { light: 50, sound: 10, people: 20, mood: 20, at: 120_000 },
    ]);
    expect(report.averageLight).toBe(50);
    expect(report.peakNoise).toBe(80);
    expect(report.calmestMinute).toBe(2);
    expect(report.averagePeople).toBe(1.35);
  });

  it("unlocks achievements only after their thresholds", () => {
    expect(achievementFor("Calm", 29, 20)).toBeNull();
    expect(achievementFor("Calm", 30, 20)).toBe("Zen Room");
    expect(achievementFor("Lively", 20, 20)).toBe("Party Mode");
    expect(achievementFor("Dim", 30, 20)).toBe("Night Owl");
    expect(achievementFor("Focused", 1, 80)).toBe("Crowd Pleaser");
  });
});
