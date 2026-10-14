# AEVIA deployment and local run

## Local development

This archive contains the complete AEVIA source project. It does not include `node_modules` or build output.

```bash
unzip AEVIA-complete-final.zip -d aevia
cd aevia
pnpm install --frozen-lockfile
pnpm dev --host 0.0.0.0
```

Open the local URL printed by Vite. The important routes are:

- `/`
- `/ar-labs`
- `/crime-report`
- `/ai-news`
- `/ai-intelligence`
- `/world-explorer`
- `/room-reader`

## Vercel

1. Import the extracted project folder into Vercel.
2. Keep the project root at the folder containing `package.json` and `vercel.json`.
3. Use **pnpm** as the package manager.
4. The framework is already declared as **TanStack Start** in `vercel.json`.
5. Use the default Vercel build settings; Vercel will run the project build from `package.json`.
6. If AI features should answer questions, add `OPENAI_API_KEY` as a server-only Vercel environment variable. Do not prefix it with `VITE_`.

Camera and microphone features require HTTPS in the deployed environment. Permissions are opt-in and local processing behavior is preserved.
