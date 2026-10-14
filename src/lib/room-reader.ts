export type RoomMood = "Calm" | "Focused" | "Lively" | "Loud" | "Crowded" | "Dim";

export type RoomSignals = {
  light: number;
  sound: number;
  people: number;
};

export type MoodResult = {
  score: number;
  label: RoomMood;
};

export type RoomSample = RoomSignals & { mood: number; at: number };
export type RoomReport = {
  averageLight: number;
  averageSound: number;
  averagePeople: number;
  peakNoise: number;
  peakNoiseAt: number;
  calmestMinute: number;
};

export const ACHIEVEMENTS = ["Zen Room", "Party Mode", "Night Owl", "Crowd Pleaser"] as const;
export type Achievement = (typeof ACHIEVEMENTS)[number];

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** Converts a 0–255 RGB pixel buffer into an average brightness percentage. */
export function averageBrightness(data: ArrayLike<number>): number {
  if (data.length < 4) return 0;
  let total = 0;
  let pixels = 0;
  for (let index = 0; index + 2 < data.length; index += 4) {
    total += 0.2126 * data[index]! + 0.7152 * data[index + 1]! + 0.0722 * data[index + 2]!;
    pixels += 1;
  }
  return pixels ? clamp((total / pixels / 255) * 100) : 0;
}

/** Converts an analyser's byte time-domain waveform into a smoothed RMS percentage. */
export function rmsVolume(data: ArrayLike<number>): number {
  if (!data.length) return 0;
  let sum = 0;
  for (let index = 0; index < data.length; index += 1) {
    const sample = (data[index]! - 128) / 128;
    sum += sample * sample;
  }
  return clamp(Math.sqrt(sum / data.length) * 180);
}

export function smoothValue(previous: number, next: number, factor = 0.2): number {
  const amount = clamp(factor, 0, 1);
  return previous + (next - previous) * amount;
}

export function smoothSignals(previous: RoomSignals, next: RoomSignals, factor = 0.2): RoomSignals {
  return {
    light: smoothValue(previous.light, next.light, factor),
    sound: smoothValue(previous.sound, next.sound, factor),
    people: smoothValue(previous.people, next.people, factor),
  };
}

export function moodFromSignals(signals: RoomSignals): MoodResult {
  const people = clamp(signals.people);
  const score = Math.round(clamp(signals.light * 0.25 + signals.sound * 0.4 + people * 0.35));
  let label: RoomMood;
  if (signals.light < 22) label = "Dim";
  else if (people >= 78) label = "Crowded";
  else if (signals.sound >= 78) label = "Loud";
  else if (score >= 62) label = "Lively";
  else if (score >= 38) label = "Focused";
  else label = "Calm";
  return { score, label };
}

export function moodTone(label: RoomMood): string {
  if (label === "Calm" || label === "Focused") return "calm";
  if (label === "Lively") return "lively";
  if (label === "Loud" || label === "Crowded") return "loud";
  return "dim";
}

export function roomReport(samples: RoomSample[]): RoomReport {
  if (!samples.length) {
    return {
      averageLight: 0,
      averageSound: 0,
      averagePeople: 0,
      peakNoise: 0,
      peakNoiseAt: 0,
      calmestMinute: 0,
    };
  }
  const average = (key: keyof RoomSignals) =>
    Math.round(samples.reduce((total, sample) => total + sample[key], 0) / samples.length);
  const peak = samples.reduce(
    (best, sample) => (sample.sound > best.sound ? sample : best),
    samples[0]!,
  );
  const minuteBuckets = new Map<number, number[]>();
  samples.forEach((sample) => {
    const minute = Math.floor(sample.at / 60_000);
    minuteBuckets.set(minute, [...(minuteBuckets.get(minute) ?? []), sample.mood]);
  });
  const calmest = [...minuteBuckets.entries()].reduce(
    (best, entry) => {
      const score = entry[1].reduce((sum, value) => sum + value, 0) / entry[1].length;
      return score < best.score ? { minute: entry[0], score } : best;
    },
    { minute: 0, score: Number.POSITIVE_INFINITY },
  );
  return {
    averageLight: average("light"),
    averageSound: average("sound"),
    averagePeople: average("people") / 20,
    peakNoise: Math.round(peak.sound),
    peakNoiseAt: peak.at,
    calmestMinute: calmest.minute,
  };
}

export function achievementFor(
  label: RoomMood,
  secondsAtMood: number,
  people: number,
): Achievement | null {
  if (label === "Calm" && secondsAtMood >= 30) return "Zen Room";
  if (label === "Lively" && secondsAtMood >= 20) return "Party Mode";
  if (label === "Dim" && secondsAtMood >= 30) return "Night Owl";
  if (people >= 80) return "Crowd Pleaser";
  return null;
}
