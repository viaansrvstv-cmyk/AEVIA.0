import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import countryList from "@/assets/world-bank-country-list.json";
import { fetchLatestHomicideRate, type LatestObservation } from "@/lib/world-bank";

type CountryChoice = { code: string; name: string };
type CountryRate = { country: CountryChoice; observation: LatestObservation | null };
const COUNTRIES = countryList as CountryChoice[];
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));
const RATE_COLORS = ["#d65a7a", "#8c6bb1"];

function CountrySelect({
  label,
  value,
  otherValue,
  onChange,
}: {
  label: string;
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code} disabled={country.code === otherValue}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CountryCrimeComparison() {
  const [firstCode, setFirstCode] = useState("IND");
  const [secondCode, setSecondCode] = useState("USA");
  const [rates, setRates] = useState<CountryRate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  const selected = useMemo(
    () =>
      [COUNTRY_BY_CODE.get(firstCode), COUNTRY_BY_CODE.get(secondCode)].filter(
        (item): item is CountryChoice => Boolean(item),
      ),
    [firstCode, secondCode],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    Promise.all(
      selected.map(async (country) => ({
        country,
        observation: await fetchLatestHomicideRate(country.code, controller.signal),
      })),
    )
      .then((result) => {
        if (!controller.signal.aborted) setRates(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setRates(null);
          setError(true);
          console.warn("World Bank country comparison failed", cause);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, retry]);

  const chartData = useMemo(
    () =>
      (rates ?? []).map(({ country, observation }) => ({
        country: country.name,
        rate: observation?.value ?? null,
      })),
    [rates],
  );

  return (
    <section
      className="rounded-3xl border border-border bg-card p-5 sm:p-7"
      aria-labelledby="country-comparison-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Cross-country view · World Bank</p>
          <h2 id="country-comparison-title" className="mt-2 font-display text-3xl sm:text-4xl">
            Compare countries
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Intentional homicides per 100,000 people, using each country’s latest year with a
            reported value.
          </p>
        </div>
        <a
          className="text-sm text-primary underline-offset-4 hover:underline"
          href="/world-bank-credits.txt"
        >
          Source and method
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CountrySelect
          label="Country one"
          value={firstCode}
          otherValue={secondCode}
          onChange={setFirstCode}
        />
        <CountrySelect
          label="Country two"
          value={secondCode}
          otherValue={firstCode}
          onChange={setSecondCode}
        />
      </div>

      {loading ? (
        <div
          className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-border bg-background/60"
          role="status"
        >
          <p className="text-sm text-muted-foreground">
            Loading the latest World Bank observations…
          </p>
        </div>
      ) : error ? (
        <div
          className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-border bg-background/60 px-5 text-center"
          role="alert"
        >
          <div>
            <p className="font-medium">World Bank data couldn’t load.</p>
            <button
              type="button"
              className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => setRetry((count) => count + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(rates ?? []).map(({ country, observation }, index) => (
              <div
                key={country.code}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
                <p className="eyebrow">{country.name}</p>
                <p
                  className="mt-2 font-display text-3xl"
                  aria-label={
                    observation
                      ? `${observation.value.toFixed(2)} homicides per 100,000`
                      : "No data"
                  }
                >
                  {observation ? observation.value.toFixed(2) : "No data"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {observation
                    ? `per 100,000 · ${observation.year}`
                    : "No data reported for this indicator"}
                </p>
                <span className="sr-only">Series {index + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-64 rounded-2xl border border-border bg-background/40 p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="country"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "per 100,000",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  formatter={(value) => [
                    value == null ? "No data" : `${Number(value).toFixed(2)} per 100,000`,
                    "Homicide rate",
                  ]}
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="rate" name="Homicide rate" radius={[7, 7, 0, 0]} maxBarSize={92}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.country} fill={RATE_COLORS[index % RATE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        Homicide is the only crime measure compared here that is comparable between countries;
        definitions and reporting for other crime types differ.
      </p>
    </section>
  );
}
