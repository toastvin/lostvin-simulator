# Social Policy Lab

Phase 1 scaffold for the Social Policy Lab simulator.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui base setup
- Zustand
- Recharts
- Vitest
- pnpm
- Docker

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Docker Development

```bash
docker compose up --build
```

The container runs `pnpm dev --hostname 0.0.0.0 --port 3000` in webpack mode and mounts the project directory for hot reload.

By default, the app is published at `http://localhost:3001`.

If you want to use a different host port:

```bash
APP_PORT=3000 docker compose up --build
```

Useful commands:

```bash
docker compose up --build
docker compose down
```

If you change dependencies in `package.json` or `pnpm-lock.yaml`, rebuild with:

```bash
docker compose up --build
```

If the container cache or mounted volumes get out of sync, reset them with:

```bash
docker compose down -v
docker compose up --build
```

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm test
```

## Static Export

This project is configured with `output: "export"` in Next.js, so `pnpm build` generates a fully static site in `out/`.

Local development stays the same:

```bash
pnpm dev
```

The main constraint is that future features must remain compatible with static export. Avoid adding server-only Next.js features such as API routes, `cookies()`, `headers()`, dynamic server rendering, or server actions unless you want to switch back to a Node runtime deployment.

## Deploy To Vercel

This repository includes `vercel.json`, so Vercel can deploy the generated `out/` directory as-is.

- Import the repository into Vercel.
- Build command: `pnpm build`
- Output directory: `out`

## Deploy To Cloudflare Pages

This repository includes `wrangler.jsonc` for Cloudflare Pages.

- Connect the repository in Cloudflare Pages.
- Build command: `pnpm build`
- Build output directory: `out`

If you want to deploy from the CLI instead of Git integration, build first and then deploy the `out/` directory with Wrangler.
