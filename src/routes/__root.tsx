import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { GlobalWelcome, SiteHeader, SiteFooter } from "../components/site-chrome";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AEVIA — Spatial interfaces, public data and machine intelligence" },
      {
        name: "description",
        content:
          "AEVIA: a student research platform for AR hand tracking, India crime data and AI news.",
      },
      { name: "author", content: "AEVIA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo-mark.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              const saved = JSON.parse(localStorage.getItem("aevia-appearance") || "{}");
              const root = document.documentElement;
              const dark = saved.theme === "dark" || (saved.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
              root.classList.toggle("dark", dark);
              root.classList.toggle("reduce-motion", saved.reduceMotion === true || saved.animation === "off");
              root.dataset.font = ["editorial", "sans", "serif"].includes(saved.font) ? saved.font : "editorial";
              root.dataset.textSize = ["small", "normal", "large"].includes(saved.textSize) ? saved.textSize : "normal";
              root.dataset.cursorFeel = ["steady", "balanced", "quick"].includes(saved.cursorFeel) ? saved.cursorFeel : "balanced";
              root.dataset.accent = saved.accent || "rose";
              root.dataset.blur = saved.blur || "medium";
              root.dataset.animation = saved.animation || "full";
              root.dataset.orbSkin = saved.orbSkin || "aurora";
              root.dataset.orbSize = saved.orbSize || "standard";
              root.dataset.orbSpeed = saved.orbSpeed || "balanced";
              root.dataset.orbGlow = saved.orbGlow === false ? "off" : "on";
              root.dataset.orbParticles = saved.orbParticles === false ? "off" : "on";
              root.style.colorScheme = dark ? "dark" : "light";
            } catch {}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion")
    ) {
      const timer = window.setTimeout(() => setVisible(false), 100);
      return () => window.clearTimeout(timer);
    }
    const fade = window.setTimeout(() => setLeaving(true), 320);
    const remove = window.setTimeout(() => setVisible(false), 500);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(remove);
    };
  }, []);
  return visible ? (
    <div
      className={`intro-overlay${leaving ? " is-leaving" : ""}`}
      aria-label="AEVIA"
      aria-hidden="true"
    >
      <div className="intro-lockup">
        <img className="intro-logo-mark" src="/logo-mark.png" alt="" />
        <span>AEVIA</span>
      </div>
    </div>
  ) : null;
}

function HeadingRevealObserver() {
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    const scan = () =>
      document
        .querySelectorAll("main h1, main h2, main h3, .hero-copy, [data-reveal]")
        .forEach((node, index) => {
          if (!seen.has(node)) {
            seen.add(node);
            node.classList.add("reveal-on-view");
            node.setAttribute("style", `--reveal-index: ${index % 6}`);
            observer.observe(node);
          }
        });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.querySelector("main") ?? document.body, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className="flex min-h-screen flex-col">
        <IntroOverlay />
        <HeadingRevealObserver />
        <SiteHeader />
        <GlobalWelcome />
        <Toaster position="bottom-right" />
        <main className="flex-1">
          <div key={pathname} className="route-transition">
            <Outlet />
          </div>
        </main>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}
