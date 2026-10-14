import { createServerFn } from "@tanstack/react-start";

export type Headline = {
  id: string;
  title: string;
  url: string;
  source: string;
  points: number;
  at: number;
};

// Live AI headlines from the public Hacker News search API (no key needed).
export const getLiveHeadlines = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: Headline[]; fetchedAt: number }> => {
    const since = Math.floor(Date.now() / 1000) - 3 * 86400;
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=created_at_i>${since},points>15&hitsPerPage=20`,
    );
    if (!res.ok) throw new Error("News feed is unavailable right now.");
    const json = (await res.json()) as {
      hits: {
        objectID: string;
        title?: string;
        url?: string;
        points?: number;
        created_at_i: number;
      }[];
    };
    const items = json.hits
      .filter((h) => h.title)
      .map((h) => {
        const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
        let source = "news.ycombinator.com";
        try {
          source = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* keep */
        }
        return {
          id: h.objectID,
          title: h.title!,
          url,
          source,
          points: h.points ?? 0,
          at: h.created_at_i * 1000,
        };
      });
    return { items, fetchedAt: Date.now() };
  },
);
