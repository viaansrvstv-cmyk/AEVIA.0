import { useEffect, useState } from "react";
import { CloudSun, MapPin, Moon, RefreshCw, Share2, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import countryBasics from "@/assets/country-basics.json";
import { fetchJson, localClock, weatherCondition, type Location } from "@/lib/world-explorer";

type Basics = {
  flag: string;
  capital: string[];
  population: number | null;
  languages: Record<string, string>;
  currency?: string;
  funFact?: string;
};
type Weather = {
  timezone: string;
  current: { temperature_2m: number; weather_code: number; time: string };
  current_units?: { temperature_2m: string };
};
const BASICS_BY_CODE = countryBasics as Record<string, Basics>;

export function WorldLocationPanel({
  location,
  onClose,
}: {
  location: Location;
  onClose: () => void;
}) {
  const [basics, setBasics] = useState<Basics>();
  const [basicError, setBasicError] = useState(false);
  const [weather, setWeather] = useState<Weather>();
  const [weatherError, setWeatherError] = useState(false);
  const [zone, setZone] = useState<string>();
  const [zoneError, setZoneError] = useState(false);
  const [now, setNow] = useState<Date>();
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setNow(new Date());
    };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    const item = BASICS_BY_CODE[location.country.code];
    setBasics(item);
    setBasicError(!item);
  }, [location.country.code]);

  useEffect(() => {
    const controller = new AbortController();
    setWeather(undefined);
    setWeatherError(false);
    setZone(undefined);
    setZoneError(false);
    const coords = `latitude=${location.lat.toFixed(4)}&longitude=${location.lon.toFixed(4)}`;
    const load = async () => {
      try {
        const data = await fetchJson<Weather>(
          `https://api.open-meteo.com/v1/forecast?${coords}&current=temperature_2m,weather_code&timezone=auto`,
          controller.signal,
        );
        new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
        if (!data.current || !Number.isFinite(data.current.temperature_2m)) {
          throw new Error("No current forecast");
        }
        setWeather(data);
        setWeatherError(false);
        setZone(data.timezone);
        setZoneError(false);
      } catch {
        if (controller.signal.aborted) return;
        setWeatherError(true);
        try {
          const data = await fetchJson<{ timezone?: { id?: string } }>(
            `https://timeapi.io/api/timezone/coordinate?${coords}`,
            controller.signal,
          );
          const id = (data as unknown as { timeZone?: string }).timeZone ?? data.timezone?.id;
          if (!id) throw new Error("No timezone");
          new Intl.DateTimeFormat("en", { timeZone: id }).format();
          setZone(id);
          setZoneError(false);
        } catch {
          if (!controller.signal.aborted) setZoneError(true);
        }
      }
    };
    void load();
    const timer = setInterval(
      () => {
        if (!document.hidden) void load();
      },
      5 * 60 * 1000,
    );
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [location.lat, location.lon, retry]);

  const clock = zone && now ? localClock(now, zone) : undefined;
  const shareCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#171729");
    gradient.addColorStop(1, "#4c3159");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f9f6f2";
    context.font = "64px sans-serif";
    context.fillText(`${basics?.flag ?? "🌍"} ${location.country.name}`, 72, 150);
    context.font = "32px monospace";
    context.fillText(
      clock ? `${clock.time} · ${clock.day ? "Day" : "Night"}` : "Local time loading…",
      76,
      230,
    );
    context.font = "26px sans-serif";
    context.fillText(`Capital · ${basics?.capital?.join(", ") || "Not listed"}`, 76, 320);
    context.fillText("AEVIA · WORLD EXPLORER", 76, 520);
    const link = document.createElement("a");
    link.download = `${location.country.id.toLowerCase()}-aevia-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  return (
    <aside
      className="world-info rounded-3xl border border-border bg-card p-6 shadow-soft"
      aria-label="Selected location details"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Location vitals</p>
          <h2 className="mt-3 flex items-center gap-3 font-display text-4xl">
            <span className="text-3xl" aria-hidden>
              {basics?.flag}
            </span>
            {location.country.name}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close location details"
          title="Close location details"
        >
          <X />
        </Button>
      </div>
      <p className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        {Math.abs(location.lat).toFixed(2)}° {location.lat < 0 ? "S" : "N"} ·{" "}
        {Math.abs(location.lon).toFixed(2)}° {location.lon < 0 ? "W" : "E"}
      </p>
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Local time</p>
          {clock && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              {clock.day ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {clock.day ? "Day" : "Night"}
            </span>
          )}
        </div>
        {clock ? (
          <>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="world-clock-ring"
                aria-hidden
                style={{
                  background: `conic-gradient(var(--primary) ${(Number(clock.time.slice(6, 8)) / 60) * 100}%, var(--border) 0)`,
                }}
              >
                <div />
              </div>
              <p className="font-mono text-3xl tabular-nums" data-testid="local-time">
                {clock.time}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{clock.date}</p>
            <p className="mt-1 break-words font-mono text-xs text-primary">{zone}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {zoneError
              ? "Local time is taking a little break. Please try again."
              : "Finding the local timezone…"}
          </p>
        )}
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <p className="eyebrow">Current weather</p>
        {weather ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <CloudSun className="size-7 text-primary" />
              <p className="font-display text-4xl" data-testid="temperature">
                {Math.round(weather.current.temperature_2m)}°C
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {weatherCondition(weather.current.weather_code)}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {weatherError
              ? "The weather service couldn’t connect. The rest of your location stays available."
              : "Checking the latest weather…"}
          </p>
        )}
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <p className="eyebrow">Country basics</p>
        {basics ? (
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Capital</dt>
              <dd className="mt-1">{basics.capital.join(", ") || "No official capital"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Population</dt>
              <dd className="mt-1 tabular-nums">
                {basics.population
                  ? new Intl.NumberFormat("en").format(basics.population)
                  : "Not available"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Official languages</dt>
              <dd className="mt-1">{Object.values(basics.languages).join(", ") || "Not listed"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="mt-1">{basics.currency ?? "Not listed in offline atlas"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fun fact</dt>
              <dd className="mt-1">
                {basics.funFact ?? "Every country has a story worth exploring."}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {basicError
              ? "Country facts are not included in the offline atlas."
              : "Loading country details…"}
          </p>
        )}
      </div>
      {(weatherError || zoneError) && (
        <Button
          onClick={() => setRetry((value) => value + 1)}
          variant="outline"
          className="mt-5 rounded-full"
        >
          <RefreshCw />
          Try again
        </Button>
      )}
      <Button onClick={shareCard} variant="outline" className="mt-5 w-full rounded-full">
        <Share2 /> Save / share card
      </Button>
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Open-Meteo ·{" "}
        <a href="/country-data-credits.txt" className="underline underline-offset-2">
          {"Country data & ODbL 1.0"}
        </a>
        <br />
        Weather at the selected coordinates. Population is a published estimate.
      </p>
    </aside>
  );
}
