export type Coord = [number, number];
export type Country = {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};
export type Location = { country: Country; lat: number; lon: number };
export function polygons(country: Country): number[][][][] {
  return country.geometry.type === "Polygon"
    ? [country.geometry.coordinates as number[][][]]
    : (country.geometry.coordinates as number[][][][]);
}
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  if (ring.length < 3) return false;
  const unwrapped: number[][] = [];
  let previous = ring[0]?.[0] ?? 0;
  for (const p of ring) {
    let x = p[0] ?? 0;
    while (x - previous > 180) x -= 360;
    while (x - previous < -180) x += 360;
    unwrapped.push([x, p[1] ?? 0]);
    previous = x;
  }
  const center = unwrapped.reduce((s, p) => s + (p[0] ?? 0), 0) / unwrapped.length;
  const x = lon + 360 * Math.round((center - lon) / 360);
  let inside = false;
  for (let i = 0, j = unwrapped.length - 1; i < unwrapped.length; j = i++) {
    const a = unwrapped[i],
      b = unwrapped[j];
    if (!a || !b) continue;
    const ax = a[0] ?? 0,
      ay = a[1] ?? 0,
      bx = b[0] ?? 0,
      by = b[1] ?? 0;
    if (ay > lat !== by > lat && x < ((bx - ax) * (lat - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function countryAt(countries: Country[], lat: number, lon: number): Country | undefined {
  return countries.find((c) =>
    polygons(c).some((p) => {
      const outer = p[0];
      return outer && inRing(lon, lat, outer) && !p.slice(1).some((hole) => inRing(lon, lat, hole));
    }),
  );
}
export function localClock(date: Date, zone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).format(
      date,
    ),
  );
  return {
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date),
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
    day: hour >= 6 && hour < 18,
  };
}
export function weatherCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3)
    return ["Clear sky", "Mainly clear", "Partly cloudy", "Overcast"][code] ?? "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Conditions unavailable";
}
export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(18000)]),
  });
  if (!response.ok) throw new Error("Service temporarily unavailable");
  return response.json() as Promise<T>;
}

export type SunPosition = { latitude: number; longitude: number; altitude: number };

/** Approximate sub-solar point, suitable for a smooth visual day/night terminator. */
export function sunPosition(date: Date): SunPosition {
  const day = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const meanLongitude = (280.46 + 0.9856474 * day) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * day) * Math.PI) / 180;
  const eclipticLongitude =
    meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly);
  const declination = Math.asin(
    Math.sin((23.4393 * Math.PI) / 180) * Math.sin((eclipticLongitude * Math.PI) / 180),
  );
  const longitude =
    ((((280.46061837 + 360.98564736629 * day - eclipticLongitude) % 360) + 540) % 360) - 180;
  return { latitude: (declination * 180) / Math.PI, longitude, altitude: 90 - Math.abs(longitude) };
}

export function timeDifferenceHours(date: Date, zoneA: string, zoneB: string): number {
  const parts = (zone: string) => {
    const values = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return (
      Number(values.find((part) => part.type === "hour")?.value ?? 0) +
      Number(values.find((part) => part.type === "minute")?.value ?? 0) / 60
    );
  };
  const difference = parts(zoneB) - parts(zoneA);
  return Math.round(difference * 2) / 2;
}

export function quizScore(
  correct: boolean,
  streak: number,
  secondsLeft: number,
): { points: number; nextStreak: number } {
  if (!correct) return { points: 0, nextStreak: 0 };
  return {
    points: 100 + streak * 25 + Math.max(0, Math.round(secondsLeft * 4)),
    nextStreak: streak + 1,
  };
}
