import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountryCrimeComparison } from "@/components/country-crime-comparison";
import { PageIntro } from "@/components/site-chrome";

export const Route = createFileRoute("/crime-report")({
  head: () => ({
    meta: [
      { title: "India Crime Report — AEVIA" },
      {
        name: "description",
        content:
          "Explore sample crime figures across Indian states, years and categories with live charts and records.",
      },
      { property: "og:title", content: "India Crime Report — AEVIA" },
      {
        property: "og:description",
        content:
          "Explore sample crime figures across Indian states, years and categories with live charts and records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrimeReport,
});

const STATES = [
  "Maharashtra",
  "Uttar Pradesh",
  "Tamil Nadu",
  "Karnataka",
  "West Bengal",
  "Rajasthan",
  "Gujarat",
  "Kerala",
];
const YEARS = [2019, 2020, 2021, 2022, 2023];
const CATS = ["Cyber Crime", "Theft", "Crimes Against Women", "Economic Offences", "Violent Crime"];
const BASE: Record<string, number> = {
  "Cyber Crime": 4000,
  Theft: 55000,
  "Crimes Against Women": 20000,
  "Economic Offences": 11000,
  "Violent Crime": 15000,
};
const POP: Record<string, number> = {
  Maharashtra: 1.25,
  "Uttar Pradesh": 1.6,
  "Tamil Nadu": 0.9,
  Karnataka: 0.8,
  "West Bengal": 0.95,
  Rajasthan: 0.85,
  Gujarat: 0.75,
  Kerala: 0.45,
};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}
const RECORDS = (() => {
  const r = rng(42);
  const out: {
    state: string;
    year: number;
    cat: string;
    cases: number;
    charged: number;
    rate: number;
  }[] = [];
  for (const state of STATES)
    for (const year of YEARS)
      for (const cat of CATS) {
        const growth = cat === "Cyber Crime" ? 1 + (year - 2019) * 0.35 : 1 + (year - 2019) * 0.03;
        const cases = Math.round((BASE[cat] ?? 1) * (POP[state] ?? 1) * growth * (0.7 + r() * 0.6));
        const charged = Math.round(cases * (0.5 + r() * 0.35));
        out.push({
          state,
          year,
          cat,
          cases,
          charged,
          rate: Math.round((cases / ((POP[state] ?? 1) * 90)) * 10) / 10,
        });
      }
  return out;
})();

const fmt = (n: number) => n.toLocaleString("en-IN");
const short = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`;

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function CrimeReport() {
  const [state, setState] = useState("All states");
  const [year, setYear] = useState("All years");
  const [cat, setCat] = useState("All categories");

  const rows = useMemo(
    () =>
      RECORDS.filter(
        (r) =>
          (state === "All states" || r.state === state) &&
          (year === "All years" || String(r.year) === year) &&
          (cat === "All categories" || r.cat === cat),
      ),
    [state, year, cat],
  );

  const total = rows.reduce((a, r) => a + r.cases, 0);
  const charged = rows.reduce((a, r) => a + r.charged, 0);
  const byState = STATES.map((s) => ({
    s,
    v: rows.filter((r) => r.state === s).reduce((a, r) => a + r.cases, 0),
  })).sort((a, b) => b.v - a.v);
  const byYear = YEARS.map((y) => ({
    name: String(y),
    cases: rows.filter((r) => r.year === y).reduce((a, r) => a + r.cases, 0),
  }));
  const byCat = CATS.map((c) => ({
    name: c.replace("Crimes Against Women", "Against Women"),
    cases: rows.filter((r) => r.cat === c).reduce((a, r) => a + r.cases, 0),
  }));

  const stats = [
    ["Reported cases", fmt(total)],
    ["Chargesheet rate", total ? `${Math.round((charged / total) * 100)}%` : "—"],
    ["Leading state", byState[0]?.v ? byState[0].s : "—"],
    ["Records in view", String(rows.length)],
  ];

  return (
    <>
      <PageIntro module="Module 02 · Data" title="India Crime Report">
        A dashboard for exploring reported crime across states, years and categories. Filter the
        view and every chart, statistic and table row updates with it.
      </PageIntro>
      <div className="mx-auto max-w-7xl space-y-6 px-5">
        <p className="rounded-2xl border border-violet/40 bg-card px-5 py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Sample data.</strong> Every figure on this page is
          illustrative and generated for this project. Real figures come from the National Crime
          Records Bureau (NCRB) annual Crime in India reports.
        </p>
        <div data-reveal className="grid gap-4 sm:grid-cols-3">
          <Select
            label="State"
            value={state}
            onChange={setState}
            options={["All states", ...STATES]}
          />
          <Select
            label="Year"
            value={year}
            onChange={setYear}
            options={["All years", ...YEARS.map(String)]}
          />
          <Select
            label="Category"
            value={cat}
            onChange={setCat}
            options={["All categories", ...CATS]}
          />
        </div>
        <div data-reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([k, v], i) => (
            <div
              data-reveal
              key={k}
              className="crime-stat-card rounded-2xl border border-border bg-card p-5"
            >
              <p className="eyebrow">{k}</p>
              <p className={`mt-3 font-display text-4xl ${i === 0 ? "text-primary" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { t: "Cases by year", d: byYear, c: "#D65A7A" },
            { t: "Cases by category", d: byCat, c: "#8C6BB1" },
          ].map((ch) => (
            <div
              data-reveal
              key={ch.t}
              className="crime-chart-card rounded-2xl border border-border bg-card p-5"
            >
              <p className="font-semibold">{ch.t}</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <BarChart data={ch.d}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={short}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{
                        background: "var(--card)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="cases" name="Reported cases" fill={ch.c} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
        <div data-reveal className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-semibold">Records</p>
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(60, rows.length)} of {rows.length}
            </p>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left">
                  {["State", "Year", "Category", "Cases", "Chargesheeted", "Rate / lakh"].map(
                    (h) => (
                      <th key={h} className="eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 60).map((r) => (
                  <tr
                    key={`${r.state}${r.year}${r.cat}`}
                    className="crime-table-row border-t border-border hover:bg-background/60"
                  >
                    <td className="px-5 py-2.5">{r.state}</td>
                    <td className="px-5 py-2.5">{r.year}</td>
                    <td className="px-5 py-2.5">{r.cat}</td>
                    <td className="px-5 py-2.5 font-mono">{fmt(r.cases)}</td>
                    <td className="px-5 py-2.5 font-mono">{fmt(r.charged)}</td>
                    <td className="px-5 py-2.5 font-mono">{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CountryCrimeComparison />
      </div>
    </>
  );
}
