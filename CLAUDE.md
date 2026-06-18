# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

When working ALWAYS start by making a markdown plan in thoughts/ unless the user says "skip plan"

- If a plan markdown already exists, or is provided by the user, work from the existing document instead of making a new one
- As you work update the thought markdown with changes and progress
- If you change the system or architecture documented in THIS DOCUMENT, UPDATE IT

DO NOT READ the .env file, it contains secrets that should NEVER be in the claude context
They are part of the ENV VARs, so you can use them (WITHOUT READING THEM INTO CONTEXT)

## Template Setup (after clone)

This is a template. Two placeholder tokens must be find+replaced after cloning.
They are kept distinct so `APP_NAME_KV` (a real binding identifier referenced as a
JS property) is never touched by the replace:

- `APP_TMP_ID` — slug-safe identifiers (npm name, worker name, domain). e.g. `chore-tracker`
- `APP_TMP_NAME` — friendly display names (PWA name, page title). e.g. `Chore Tracker`

Replace `APP_TMP_ID` first, then `APP_TMP_NAME`. Do NOT replace `APP_NAME_KV` — it is
the KV binding name (see Environment Variables) and must stay as-is.

## Commands

```bash
# Development
npm run dev              # Frontend (Vite :3000) + Backend (Wrangler :8787) in parallel
npm run dev:frontend     # Vite dev server only
npm run dev:backend      # Wrangler Workers dev server only

# Build & Deploy
npm run build            # Vite build → dist/client/
npm run deploy           # Build + wrangler deploy to Cloudflare
npm run deploy:worker    # Wrangler deploy only
npm run deploy:infra     # Terraform infrastructure deploy

# Type checking & Linting
npm run check            # style + lint + types (all checks)
npm run check:ci         # Strict CI version (no auto-fix)
npm run types            # tsc --noEmit (both tsconfigs)
npm run lint             # ESLint with auto-fix
npm run lint:ci          # ESLint zero-warnings (CI)
npm run style            # Prettier --write
npm run style:ci         # Prettier --check (CI)

# Web Push
npm run keygen           # Generate ECDSA P-256 key pair for web push
npm run push-secrets     # Push web push keys to Cloudflare secrets
```

There is no test runner configured.

## Architecture

This is a full-stack SolidJS + Cloudflare Workers app using tRPC for type-safe RPC.

**Frontend:** SolidJS + Solid Router, built with Vite. Entry point: `src/client/index.tsx`. The `VITE_AUTH0_*` env vars are baked in at build time. Dev server proxies `/api` to wrangler on `:8787`.

**Backend:** Cloudflare Workers with Hono as the HTTP framework. Entry point: `src/server/worker.ts`. This is the **only file that knows about Cloudflare** — it wires up all dependencies via dependency injection.

**Hexagonal / ports-and-adapters pattern:** The server is structured so that all Cloudflare-specific concerns are isolated in `worker.ts`. Everything else works through interfaces:
- `KvStore` (in `src/server/util/kv.ts`) — abstraction over Cloudflare KV
- `AppConfig` (in `src/server/config.ts`) — runtime config passed as function argument, not imported globally
- `JwtVerifier` (in `src/server/auth/jwt.ts`) — abstraction over JWT verification

**tRPC:** Uses SuperJSON transformer (handles Date/Set/Map). The `AppRouter` type is exported from the server and imported by the client for end-to-end type safety. Context is created per-request in `src/server/context.ts`, injecting all stores.

**Auth:** Auth0 with JWT verification via `jose`. The frontend uses the Auth0 SDK; the backend verifies JWTs on protected tRPC procedures.

**Storage:** Cloudflare KV via the `KvStore` interface. Stores follow a consistent pattern — they take a `KvStore` and config, and use `makeKey` to namespace keys.

**Web Push:** ECDSA P-256 keys, managed via `@pushforge/builder`. Keys are stored as Cloudflare secrets (`WEBPUSH_KEYS_JSON`).

**Styling:** Tailwind CSS v4 with forms and safe-area plugins, dark mode via class.

**Infrastructure:** Terraform with AWS S3 backend (state) and Cloudflare provider (DNS/Workers domain).

## UI Components & Reuse

**Read [`src/client/components/design-system/Styleguide.md`](src/client/components/design-system/Styleguide.md) before writing UI.** It is the source of truth for widths/layout, typography, font/color, and surface (rounding/border/callout) conventions, with do/don't examples.

The client has a shared component library under `src/client/components/` (barrel-exported from `src/client/components/index.ts`). **Reuse these instead of writing raw HTML elements with hand-rolled Tailwind classes** — they encode the dark-mode-aware colors, spacing, and typography for the app.

- **Surfaces** (`components/design-system/styles.ts`): use `cardStyle`, `calloutStyle`, `borderStyle`, `dividerStyle`, `fieldStyle`, and the `radius` scale instead of inlining `rounded-*`/`border-*` classes.
- Default elements to full width; constrain with flex/grid, not fixed widths (`w-48`/`w-64`).

- **Typography** (`components/design-system/Typography/`): use `H1`–`H6` for headings, and `Text` / `Paragraph` for body copy (`Text` takes `muted` / `strong` props). These apply `bodyStyle()` / `headerStyle()` from `font.ts`, which include the `dark:` text colors. Do **not** use bare `<p>`/`<span>`/`<label>` for visible text — they inherit near-black and disappear in dark mode.
- **Forms** (`components/Forms/`): `TextInput`, `Select`, `ColorPicker`, `MultiSelect`, `EditableLabel`. Forms are built with `solid-forms` (`createFormGroup` / `createFormControl`); controls are passed via the `control` prop. Any custom `<input>`/`<select>` must match `TextInput`'s field styling so heights/borders align in a row.
- **Other**: `Button` (variant/`primary`/`danger`/`small` props), `Label`, `LabelItem`, `Modal`, `PageLoader`, `SpinnerIcon`, `Toggle`, `ThemeToggle`, and `toast` for notifications.

Per-feature client state lives in a `SignalStore` subclass (`data/signalStore.ts`), exposed through the `useStores()` context (`data/stores.tsx`) and seeded from `users.appData`.

## TypeScript Configuration

Two separate tsconfigs:
- `tsconfig.json` — Client (DOM lib, Solid JSX, excludes `src/server/`)
- `tsconfig.worker.json` — Server (WebWorker lib, CloudFlare Workers types)

Run `npm run types` to check both. ESLint is flat config (eslint.config.js) with TypeScript plugin and Prettier integration.

## Code Style

`.prettierrc.json`: single quotes, trailing commas, no semicolons.

Unused variables with `_` prefix are ignored by ESLint.

## Environment Variables

**Build-time** (Vite, in `.env`):
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_DOMAIN`

**Runtime** (Cloudflare bindings, configured in `wrangler.jsonc`):
- `APP_NAME_KV` — KV namespace
- `ASSETS` — Static asset fetcher
- `WEBPUSH_KEYS_JSON` — ECDSA private JWK (Cloudflare secret)

For local dev, secrets can be passed via `--var` in wrangler or a `.dev.vars` file.
