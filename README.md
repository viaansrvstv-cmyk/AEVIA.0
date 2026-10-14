# AEVIA

A small research platform exploring spatial interfaces, public data and machine intelligence. Six focused modules bring together hand-controlled AR experiments, an India crime-data dashboard, live AI headlines, an AI assistant, an interactive world explorer and a private room reader.

## Modules

- **AR Labs** — gesture-driven camera and orb experiments.
- **India Crime Report** — filters and charts for clearly labelled research data.
- **AI News** — live headlines, short AI summaries and spoken briefings.
- **AI Intelligence** — a conversational research assistant.
- **World Explorer** — an interactive globe with country facts and local conditions.
- **Room Reader** — on-device light, sound and people signals combined into a live room mood.

## Run locally

Requires Node.js 22 or later and pnpm.

```sh
pnpm install
cp .env.example .env.local
pnpm dev --host 0.0.0.0 --port 4173
```

Add a server-side `OPENAI_API_KEY` to `.env.local` for AI Intelligence and AI News summaries. Optional settings include `OPENAI_API_BASE` and `AEVIA_AI_MODEL`. Never expose provider credentials through a `VITE_` variable or commit a real `.env.local` file.

Useful checks:

```sh
pnpm test
pnpm lint
pnpm build
```

## Publish on Vercel

1. Push this project to a GitHub repository. Do not commit `.env.local` or any real API key.
2. In Vercel, choose **Add New → Project**, connect GitHub if prompted, and import the AEVIA repository.
3. Vercel should detect **TanStack Start**. The project already registers Nitro in `vite.config.ts` and includes `vercel.json`; leave the build command and output directory on automatic detection.
4. In **Project Settings → Environment Variables**, add `OPENAI_API_KEY` and select **Production**. Add it to **Preview** too if you want AI features on preview deployments. Optional server-only values are `OPENAI_API_BASE` and `AEVIA_AI_MODEL`. Never use a `VITE_` prefix for secrets.
5. Click **Deploy**. Vercel provides a `*.vercel.app` address. Future pushes to the connected branch create new deployments automatically.

You can also deploy from a local terminal with the Vercel CLI: run `pnpm install`, then `npx vercel` to create a preview deployment or `npx vercel --prod` to publish directly to production. The CLI asks you to sign in and link the project. Do not run the production command until you are ready to make the current code public.

The Earth texture and country reference data are bundled locally; see `public/earth-texture-credits.txt` and `public/country-data-credits.txt` for attribution.
