export const HOMICIDE_INDICATOR = "VC.IHR.PSRC.P5";
export const HOMICIDE_INDICATOR_URL = `https://api.worldbank.org/v2/country/{ISO3}/indicator/${HOMICIDE_INDICATOR}?format=json&per_page=100`;

export type WorldBankObservation = { date: string; value: number | null };
export type LatestObservation = { year: number; value: number };

export function selectLatestNonNullObservation(
  observations: WorldBankObservation[] | null | undefined,
): LatestObservation | null {
  if (!observations?.length) return null;
  const latest = observations
    .filter(
      (observation) =>
        /^\d{4}$/.test(observation.date) &&
        observation.value !== null &&
        Number.isFinite(Number(observation.value)),
    )
    .sort((a, b) => Number(b.date) - Number(a.date))[0];
  return latest ? { year: Number(latest.date), value: Number(latest.value) } : null;
}

export function worldBankIndicatorUrl(countryCode: string): string {
  const iso3 = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iso3)) throw new Error("A three-letter country code is required");
  return `https://api.worldbank.org/v2/country/${encodeURIComponent(iso3)}/indicator/${HOMICIDE_INDICATOR}?format=json&per_page=100`;
}

export async function fetchLatestHomicideRate(
  countryCode: string,
  signal: AbortSignal,
): Promise<LatestObservation | null> {
  const response = await fetch(worldBankIndicatorUrl(countryCode), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`World Bank returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return null;
  const observations = (payload[1] as unknown[]).filter(
    (entry): entry is WorldBankObservation =>
      typeof entry === "object" &&
      entry !== null &&
      "date" in entry &&
      typeof entry.date === "string" &&
      "value" in entry &&
      (typeof entry.value === "number" || entry.value === null),
  );
  return selectLatestNonNullObservation(observations);
}
