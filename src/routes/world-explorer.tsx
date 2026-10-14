import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Activity, CloudSun, Dice5, Globe2, Search, Sparkles, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/site-chrome";
import { WorldLocationPanel } from "@/components/world-location-panel";
import { Button } from "@/components/ui/button";
import { countryAt, fetchJson, quizScore, type Country, type Location } from "@/lib/world-explorer";
import data from "@/assets/world-countries.json";
import basics from "@/assets/country-basics.json";

const WorldGlobe = lazy(() => import("@/components/world-globe"));
const countries = (data as Country[]).slice().sort((a, b) => a.name.localeCompare(b.name));
const countryBasics = basics as Record<
  string,
  { flag: string; capital: string[]; population: number | null }
>;
type Quake = { lat: number; lon: number; magnitude: number };
type Iss = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  over?: string;
};
const TOUR = [
  ["London", 51.5, -0.1, "A city where history and future share the same skyline."],
  ["Cairo", 30, 31.2, "The Nile turns a desert horizon into a living ribbon."],
  ["Mumbai", 19.1, 72.9, "A coastal megacity built on seven historic islands."],
  ["Singapore", 1.3, 103.8, "A compact city-state where gardens rise into the sky."],
  ["Sydney", -33.9, 151.2, "The harbour makes architecture feel almost weightless."],
  ["New York", 40.7, -74, "Millions of individual routes converge here every day."],
  ["Rio", -22.9, -43.2, "Granite peaks and ocean make the city’s geography unforgettable."],
  ["Reykjavík", 64.1, -21.9, "A small capital at the edge of fire, ice and aurora."],
] as const;

export const Route = createFileRoute("/world-explorer")({
  head: () => ({
    meta: [
      { title: "World Explorer — live globe | AEVIA" },
      {
        name: "description",
        content:
          "Explore an interactive Earth with country borders, real local time, live weather and country vitals.",
      },
      { property: "og:title", content: "World Explorer — live globe | AEVIA" },
      {
        property: "og:description",
        content:
          "Explore an interactive Earth with country borders, real local time, live weather and country vitals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorldExplorer,
});

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed)
      return (
        <div className="world-load">
          <div className="text-center">
            <p>The globe couldn’t load. Country details are still available above.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => this.setState({ failed: false })}
            >
              Retry globe
            </Button>
          </div>
        </div>
      );
    return this.props.children;
  }
}
function WorldExplorer() {
  const [location, setLocation] = useState<Location>();
  const [focus, setFocus] = useState<Country>();
  const [cloudsOn, setCloudsOn] = useState(true);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<Country>();
  const [iss, setIss] = useState<Iss>();
  const [issError, setIssError] = useState(false);
  const [quakesOn, setQuakesOn] = useState(false);
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [quakeError, setQuakeError] = useState(false);
  const [timeShiftMinutes, setTimeShiftMinutes] = useState(0);
  const [compare, setCompare] = useState<[Country | undefined, Country | undefined]>([
    undefined,
    undefined,
  ]);
  const [tourStep, setTourStep] = useState<number>();
  const [quizTarget, setQuizTarget] = useState<Country>();
  const [quizSeconds, setQuizSeconds] = useState(30);
  const [quizPoints, setQuizPoints] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [handControlOn, setHandControlOn] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    try {
      setBestScore(Number(localStorage.getItem("aevia-world-best") ?? 0));
    } catch {
      /* storage is optional */
    }
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const value = await fetchJson<Iss>(
          "https://api.wheretheiss.at/v1/satellites/25544",
          new AbortController().signal,
        );
        if (active) {
          const over = countryAt(countries, value.latitude, value.longitude)?.name;
          setIss(over ? { ...value, over } : value);
          setIssError(false);
          toast("ISS found above the globe", { id: "iss-found" });
        }
      } catch {
        if (active) setIssError(true);
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!quakesOn) {
      setQuakes([]);
      return;
    }
    const controller = new AbortController();
    void fetchJson<{
      features?: { geometry?: { coordinates?: number[] }; properties?: { mag?: number } }[];
    }>(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
      controller.signal,
    )
      .then((feed) =>
        setQuakes(
          (feed.features ?? []).slice(0, 80).flatMap((item) => {
            const c = item.geometry?.coordinates;
            const mag = item.properties?.mag;
            return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Number.isFinite(mag)
              ? [{ lon: c[0]!, lat: c[1]!, magnitude: mag! }]
              : [];
          }),
        ),
      )
      .catch(() => setQuakeError(true));
    return () => controller.abort();
  }, [quakesOn]);
  useEffect(() => {
    if (tourStep === undefined) return;
    const timer = window.setInterval(
      () => setTourStep((step) => (step === undefined ? undefined : (step + 1) % TOUR.length)),
      3750,
    );
    return () => window.clearInterval(timer);
  }, [tourStep]);
  useEffect(() => {
    if (tourStep === undefined) return;
    const [, lat, lon] = TOUR[tourStep]!;
    const country = countries.reduce(
      (closest, item) =>
        Math.hypot(item.lat - lat, item.lon - lon) <
        Math.hypot(closest.lat - lat, closest.lon - lon)
          ? item
          : closest,
      countries[0]!,
    );
    setFocus(country);
    select({ country, lat, lon });
  }, [tourStep]);
  useEffect(() => {
    if (!quizTarget) return;
    const timer = window.setInterval(
      () =>
        setQuizSeconds((seconds) => {
          if (seconds <= 1) {
            setQuizTarget(undefined);
            setQuizStreak(0);
            toast("Time’s up — try another country");
            return 30;
          }
          return seconds - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [quizTarget]);
  const closePanel = useCallback(() => {
    setPanelClosing(true);
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setLocation(undefined);
      setPanelClosing(false);
      closeTimer.current = undefined;
    }, 220);
  }, []);
  const select = useCallback((value: Location) => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
    setPanelClosing(false);
    setLocation(value);
  }, []);
  const handleSelect = useCallback(
    (value: Location) => {
      if (quizTarget) {
        const result = quizScore(value.country.id === quizTarget.id, quizStreak, quizSeconds);
        if (result.points) {
          const total = quizPoints + result.points;
          setQuizPoints(total);
          setQuizStreak(result.nextStreak);
          setBestScore((current) => {
            const best = Math.max(current, total);
            try {
              localStorage.setItem("aevia-world-best", String(best));
            } catch {
              /* optional */
            }
            return best;
          });
          toast.success(`Correct — +${result.points} points`, {
            icon: <Sparkles className="size-4" />,
          });
          setQuizTarget(undefined);
        } else {
          setQuizStreak(0);
          toast("Not quite — keep exploring");
        }
      }
      select(value);
    },
    [quizPoints, quizSeconds, quizStreak, quizTarget, select],
  );
  const surprise = () => {
    const country = countries[Math.floor(Math.random() * countries.length)]!;
    setFocus(country);
    handleSelect({ country, lat: country.lat, lon: country.lon });
  };
  const startQuiz = () => {
    const target = countries[Math.floor(Math.random() * countries.length)]!;
    setQuizTarget(target);
    setQuizSeconds(30);
    setQuizPoints(0);
    setQuizStreak(0);
    toast("Geo Quiz started — find the highlighted country");
  };
  return (
    <section className="world-page">
      <PageIntro module="Module 05 · Spatial" title="World Explorer">
        One planet. A thousand perspectives. Local time, weather and the world’s vitals — connected
        in real time.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-5">
        <div className="world-toolbar">
          <p className="eyebrow flex items-center gap-2">
            <Globe2 className="size-4 text-primary" />
            Planet Earth · Live conditions
          </p>
          <div className="world-toolbar-actions">
            <label className="world-search">
              <Search className="size-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                list="world-country-list"
                placeholder="Search countries…"
                aria-label="Search countries"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const country = countries.find(
                      (item) => item.name.toLowerCase() === query.trim().toLowerCase(),
                    );
                    if (country) {
                      setFocus(country);
                      handleSelect({ country, lat: country.lat, lon: country.lon });
                    }
                  }
                }}
              />
              <datalist id="world-country-list">
                {countries.map((country) => (
                  <option key={country.id} value={country.name} />
                ))}
              </datalist>
            </label>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={surprise}
              aria-label="Surprise me"
            >
              <Dice5 className="size-4" /> Surprise me
            </Button>
            <select
              className="world-select"
              aria-label="Choose a country"
              value={location?.country.id ?? ""}
              onChange={(e) => {
                const country = countries.find((c) => c.id === e.target.value);
                if (country) {
                  setFocus(country);
                  handleSelect({ country, lat: country.lat, lon: country.lon });
                }
              }}
            >
              <option value="" disabled>
                Choose a country
              </option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="world-cloud-toggle rounded-full"
              aria-pressed={cloudsOn}
              onClick={() => setCloudsOn((value) => !value)}
            >
              <CloudSun className="size-4" />
              Clouds {cloudsOn ? "on" : "off"}
            </Button>
            <Button
              variant={quakesOn ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setQuakesOn((value) => !value)}
              aria-pressed={quakesOn}
            >
              <Activity className="size-4" /> Quakes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setTourStep(0);
                toast("World tour started");
              }}
            >
              <Globe2 className="size-4" /> Take a tour
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={startQuiz}>
              <Trophy className="size-4" /> Geo Quiz
            </Button>
            <Button
              variant={handControlOn ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setHandControlOn((value) => !value)}
              aria-pressed={handControlOn}
            >
              <Users className="size-4" /> Hand {handControlOn ? "on" : "off"}
            </Button>
          </div>
        </div>
        <div className="world-control-strip" data-reveal>
          <label>
            <span>Time machine</span>
            <input
              type="range"
              min={-720}
              max={720}
              step={15}
              value={timeShiftMinutes}
              onChange={(event) => setTimeShiftMinutes(Number(event.target.value))}
              aria-label="Time machine"
            />
            <output>
              {timeShiftMinutes === 0
                ? "Now"
                : `${timeShiftMinutes > 0 ? "+" : ""}${Math.round(timeShiftMinutes / 60)}h`}
            </output>
          </label>
          {iss ? (
            <span className="world-live-pill">
              <span className="world-live-dot" /> ISS · {Math.round(iss.velocity)} km/h ·{" "}
              {Math.round(iss.altitude)} km{iss.over ? ` · over ${iss.over}` : ""}
            </span>
          ) : (
            <span className="world-live-pill">
              {issError ? "ISS is taking a quiet orbit" : "Finding the ISS…"}
            </span>
          )}
          {quakeError && (
            <span className="text-xs text-muted-foreground">
              Earthquakes are temporarily unavailable.
            </span>
          )}
        </div>
        {quizTarget && (
          <div className="world-quiz-banner" role="status">
            <Trophy className="size-4" /> Find <strong>{quizTarget.name}</strong>
            <span>
              {quizSeconds}s · {quizPoints} pts · streak {quizStreak}
            </span>
          </div>
        )}
        {tourStep !== undefined && (
          <div className="world-tour-card">
            <span className="eyebrow">
              Tour stop {tourStep + 1} / {TOUR.length}
            </span>
            <strong>{TOUR[tourStep]![0]}</strong>
            <p>{TOUR[tourStep]![3]}</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setTourStep(undefined)}
            >
              End tour
            </Button>
          </div>
        )}
        {hovered && (
          <div className="world-hover-label">
            <span className="world-live-dot" /> {hovered.name}
          </div>
        )}
        <div className="world-compare-controls" data-reveal>
          <span className="eyebrow">Compare mode</span>
          <select
            aria-label="First comparison country"
            value={compare[0]?.id ?? ""}
            onChange={(event) =>
              setCompare(([_, second]) => [
                countries.find((country) => country.id === event.target.value),
                second,
              ])
            }
          >
            <option value="">Country one</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">vs</span>
          <select
            aria-label="Second comparison country"
            value={compare[1]?.id ?? ""}
            onChange={(event) =>
              setCompare(([first]) => [
                first,
                countries.find((country) => country.id === event.target.value),
              ])
            }
          >
            <option value="">Country two</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        {compare[0] && compare[1] && (
          <div className="world-compare-card" data-reveal>
            {compare.map((country) => {
              const item = countryBasics[country!.code];
              return (
                <div key={country!.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item?.flag ?? "🌍"}</span>
                    <strong>{country!.name}</strong>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Capital · {item?.capital?.join(", ") || "Not listed"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Population ·{" "}
                    {item?.population
                      ? new Intl.NumberFormat("en").format(item.population)
                      : "Not available"}
                  </p>
                  <div className="world-compare-bar">
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(12, ((Math.abs(country!.lat) + Math.abs(country!.lon)) / 2) % 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coordinates · {country!.lat.toFixed(1)}°, {country!.lon.toFixed(1)}°
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="world-stage">
          <GlobeBoundary>
            <ClientOnly fallback={<p className="world-load">Preparing planet Earth…</p>}>
              <Suspense fallback={<p className="world-load">Preparing planet Earth…</p>}>
                <WorldGlobe
                  countries={countries}
                  selected={location?.country}
                  focus={focus}
                  onSelect={handleSelect}
                  cloudsOn={cloudsOn}
                  timeShiftMinutes={timeShiftMinutes}
                  earthquakes={quakes}
                  onHover={setHovered}
                  iss={iss}
                  handControlOn={handControlOn}
                />
              </Suspense>
            </ClientOnly>
          </GlobeBoundary>
          {location && (
            <div className={`world-panel-slot${panelClosing ? " is-closing" : ""}`}>
              <WorldLocationPanel
                key={location.country.id}
                location={location}
                onClose={closePanel}
              />
            </div>
          )}
        </div>
        <p className="world-caption">
          Satellite-style day imagery · Optional moving cloud layer · Natural Earth country
          boundaries. <a href="/earth-texture-credits.txt">Texture sources &amp; credits</a>.
          Borders are cartographic references, not a statement on territorial claims.
        </p>
      </div>
    </section>
  );
}
