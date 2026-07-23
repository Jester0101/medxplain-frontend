# DoctorSHAP — Risk Dashboard Frontend

A Next.js dashboard that turns a short clinical note into a 1-year cardiovascular
risk score with SHAP-style factor attribution. The frontend runs no model itself —
it calls an API. Today that API is a local mock inside Next.js; you can point it at a
real backend later by changing one environment variable.

## Run locally

Requires Node.js 18.18+ (20+ recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick a preset (or type a note), and click **Assess risk**.

## Production build

```bash
npm run build
npm start
```

## Connect a real backend (optional)

By default the app uses a built-in mock at `/api/assess`. To use a real backend that
exposes the same `POST /api/assess` contract, set this in `.env.local`:

```
NEXT_PUBLIC_API_URL=https://your-backend-url
```

Then restart the dev server — nothing else in the UI changes.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod ·
TanStack Query · framer-motion · next-themes · custom SVG charts.
