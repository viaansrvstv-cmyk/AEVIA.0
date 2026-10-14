import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/exit")({
  head: () => ({
    meta: [
      { title: "Session ended — AEVIA" },
      {
        name: "description",
        content: "Your AEVIA session has been closed and nothing was stored.",
      },
      { property: "og:title", content: "Session ended — AEVIA" },
      {
        property: "og:description",
        content: "Your AEVIA session has been closed and nothing was stored.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Exit,
});

function Exit() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow">Session ended</p>
      <h1 className="mt-4 font-display text-8xl">Goodbye.</h1>
      <p className="mt-5 text-lg text-muted-foreground">
        Thank you for exploring AEVIA. Your session has been closed and nothing was stored.
      </p>
      <Link
        to="/"
        className="mt-9 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-primary"
      >
        Return to Home
      </Link>
    </section>
  );
}
