# Cloudflare Workers Migration

Migrating from Deno Deploy to Cloudflare Workers + Pages Assets, and from Deno tooling to Node/npm.

This is the template repo. Differences from a normal app migration:
- **No data migration** — template has no real data; skip Phase 5 entirely
- **No deploy** — do not run `wrangler deploy` or push to Cloudflare at the end
- **Web push** — replace `@negrel/webpush` + `WEBPUSH_KEYS_BASE64` with `@pushforge/builder` + `WEBPUSH_KEYS_JSON`, following the pattern in `../flowchart`

Reference implementations (completed migrations):
- `../foodie` — standard Cloudflare Workers migration (no push)
- `../flowchart` — Cloudflare Workers migration **with pushforge web push** (primary push reference)

DO NOT READ the .env file, it contains secrets that should NEVER be in the claude context.
They are part of the ENV VARs, so you can use them (WITHOUT READING THEM INTO CONTEXT).

---

## What Needs to Change

### Tooling

| Current                                | New                                         | Scope            |
| -------------------------------------- | ------------------------------------------- | ---------------- |
| `deno.json` import map + tasks         | `package.json` deps + scripts               | project root     |
| `deno run -A npm:vite`                 | `vite` (npm script)                         | dev/build        |
| `deno run -A ... src/server/server.ts` | `wrangler dev`                              | dev              |
| `deployctl deploy`                     | `wrangler deploy`                           | deploy           |
| `jsr:` / `npm:` import prefixes        | bare npm specifiers                         | all server files |
| `tsconfig` with `deno.ns` lib          | `tsconfig.worker.json` with `webworker` lib | server TS config |

### Backend

| Deno Deploy API                              | Cloudflare Equivalent                                | Scope                     |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------- |
| `Deno.serve()`                               | Hono app + `export default app`                      | `server.ts` → `worker.ts` |
| `Deno.openKv()` / `Deno.Kv`                  | Cloudflare KV namespace (`env.APP_NAME_KV`)          | `context.ts`, all stores  |
| `Deno.env.get()`                             | `env.VAR_NAME` (passed into handler)                 | `config.ts`               |
| `@kyeotic/server` (serveStatic, withCors)    | Cloudflare ASSETS binding + Hono CORS middleware     | `server.ts`, static files |
| `@kyeotic/server` (createJwtVerifier)        | `jose` npm package                                   | `trpc.ts`                 |
| `@kyeotic/server` (lazy)                     | direct instantiation from `env`                      | `context.ts`              |
| `@kyeotic/server/kv` (makeSet, listAllValues, batchGet, etc.) | new `util/kv.ts` helpers (CF KV API) | all stores           |
| `@negrel/webpush`                            | `@pushforge/builder` + `rfc4648`                     | webpush                   |
| `WEBPUSH_KEYS_BASE64`                        | `WEBPUSH_KEYS_JSON` (private JWK as JSON string)     | config, keygen            |
| `.ts` import extensions                      | no extensions (bundler convention)                   | all server files          |
| Array KV keys                                | colon-delimited string keys                          | all stores                |

### Frontend

| Current                                    | New                                         | Scope              |
| ------------------------------------------ | ------------------------------------------- | ------------------ |
| Vite outDir `../../dist` (root-level)      | Vite outDir `../../dist/client`             | `vite.config.ts`   |
| Served by backend `serveStatic` middleware | Cloudflare ASSETS binding (`wrangler.jsonc`)| `wrangler.jsonc`   |
| `apiUrl: 'http://localhost:8080'`          | `apiUrl: ''` (relative, via Vite proxy)     | `src/client/config.ts` |

### KV Key Structure Change

Current stores use `makeSet(name)` producing array-style Deno KV keys.
Cloudflare KV uses string keys:

| Store       | Deno KV key                     | Cloudflare KV key               |
| ----------- | ------------------------------- | ------------------------------- |
| UserStore   | `['USERS', userId]`             | `"USERS:${userId}"`             |
| UserStore   | `['USERNAMES', username]`       | `"USERNAMES:${username}"`       |
| UserStore   | `['EX_ID', source, externalId]` | `"EX_ID:${source}:${externalId}"` |
| PlayerStore | `['PLAYERS', userId, playerId]` | `"PLAYERS:${userId}:${playerId}"` |
| PushStore   | `['PUSH', userId, subId]`       | `"PUSH:${userId}:${subId}"`     |

List prefix `['USERS']` → `.list({ prefix: 'USERS:' })` etc.

---

## Phase 1: Cloudflare Project Setup

- [ ] Create `wrangler.jsonc` with KV binding and ASSETS config
- [ ] Create KV namespace (prod + preview) via `npx wrangler kv namespace create APP_NAME_KV`
- [ ] Add env vars to `.env`: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

**`wrangler.jsonc`:**
```jsonc
{
  "name": "APP_NAME",
  "main": "src/server/worker.ts",
  "compatibility_date": "2025-11-17",
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS",
    "run_worker_first": true
  },
  "kv_namespaces": [
    {
      "binding": "APP_NAME_KV",
      "id": "<prod-namespace-id>",
      "preview_id": "<preview-namespace-id>"
    }
  ],
  "observability": {
    "enabled": true
  }
}
```

Note: `nodejs_compat` is intentionally omitted — server code targets Web APIs only.

---

## Phase 2: Tooling Migration (Deno → Node/npm)

- [ ] Add server deps to `package.json`: `hono`, `jose`, `npm-run-all2`, `@pushforge/builder`, `rfc4648`
- [ ] Add `wrangler`, `@cloudflare/workers-types` to `package.json` devDependencies
- [ ] Update `package.json` scripts:

```json
"scripts": {
  "dev:frontend": "vite",
  "dev:backend": "wrangler dev --var WEBPUSH_KEYS_JSON:$WEBPUSH_KEYS_JSON",
  "dev": "npm-run-all --parallel dev:frontend dev:backend",
  "build": "vite build",
  "deploy": "run-s build deploy:worker",
  "deploy:worker": "wrangler deploy",
  "deploy:infra": "./infra/deploy",
  "push-secrets": "echo $WEBPUSH_KEYS_JSON | npx wrangler secret put WEBPUSH_KEYS_JSON",
  "style": "prettier --write \"src/**/*.{ts,tsx}\"",
  "style:ci": "prettier --check \"src/**/*.{ts,tsx}\""
}
```

Note: No `AUTH0_DOMAIN` env var needed — issuer is hardcoded in `trpc.ts` (same as `../flowchart`).

- [ ] Add `tsconfig.worker.json` for server code:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "WebWorker"],
    "strict": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/server/**/*"]
}
```

- [ ] Update root `tsconfig.json`: remove `deno.ns` / `deno.unstable` from `lib`; the root config covers client code only (keep `DOM`, `DOM.Iterable`, `ESNext`)
- [ ] Delete `deno.json` and `deno.lock`

---

## Phase 3: Frontend Build Setup

- [ ] Update `vite.config.ts`: change `build.outDir` from `../../dist` to `../../dist/client`
- [ ] Add `/api` proxy to vite dev server config (routes frontend dev requests to `wrangler dev` on :8787)

**Updated `vite.config.ts`:**
```ts
export default defineConfig({
  root: './src/client',
  publicDir: '../public',
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: '../../dist/client',   // was ../../dist
    target: 'esnext',
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, 'src/client/index.html'),
    },
  },
})
```

- [ ] Update `src/client/config.ts` (or wherever `apiUrl` is set for localhost): use `''` (empty string) so requests go through Vite proxy:

```ts
apiUrl:
  origin.includes('localhost') || origin.includes('127.0.0.1')
    ? ''
    : origin,
```

---

## Phase 4: Backend Code Migration

### 4a. `src/server/types.ts`

Create with `WorkerEnv`:
```ts
export interface WorkerEnv {
  APP_NAME_KV: KVNamespace
  ASSETS: Fetcher
  WEBPUSH_KEYS_JSON: string
}
```

### 4b. `src/server/util/kv.ts`

Replace `Deno.Kv` helpers with Cloudflare KV equivalents (copy pattern from `../flowchart/src/server/util/kv.ts`):

- `makeSet(name)` → `makeKey(...parts)` joining with `:`
- `listAllValues(kv, prefix[])` → paginated `kv.list({ prefix })` then `kv.get` (handles cursor)
- `create()` / `update()` / `put()` → `kvCreate` / `kvUpdate` / `kvPut` using `kv.get` + `kv.put(key, JSON.stringify(value))`
- Remove `upsert`, `deleteEntireDb` (not needed in the template)
- Add `batchGet` helper (used by UserStore):

```ts
export async function batchGet<T>(kv: KVNamespace, keys: string[]): Promise<T[]> {
  const values = await Promise.all(keys.map((k) => kv.get<T>(k, 'json')))
  return values.filter((v): v is T => v !== null)
}
```

### 4c. `src/server/config.ts`

Replace `Deno.env.get()` with `env` parameter; change `keysBase64` → `keysJson`:
```ts
import type { WorkerEnv } from './types'

export const authConfig = {
  audience: 'kyeotek',
  issuer: 'https://kyeotek-auth0.kye.dev/',
} as const

export function getConfig(env: WorkerEnv) {
  return {
    auth: authConfig,
    webpush: {
      adminEmail: 'tim@kye.dev',
      keysJson: env.WEBPUSH_KEYS_JSON,
    },
  } as const
}
```

Note: `PORT`, `isDenoDeploy`, and `distDir` are all gone — no longer needed.

### 4d. `src/server/util/kv.ts` — remove `lazy.ts`

`lazy.ts` is only needed for the singleton `Deno.openKv()` pattern. Delete it; context now instantiates stores directly from `env`.

### 4e. `src/server/context.ts`

Replace `lazy()` + `Deno.openKv()` with direct instantiation from `env`:
```ts
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { WorkerEnv } from './types'
import UserStore from './users/userStore'
import PlayerStore from './players/playerStore'
import PushStore from './webpush/pushStore'

export function createAppContext(env: WorkerEnv) {
  return (opts: FetchCreateContextFnOptions) => ({
    env,
    stores: {
      users: new UserStore(env.APP_NAME_KV),
      players: new PlayerStore(env.APP_NAME_KV),
      push: new PushStore(env.APP_NAME_KV),
    },
    req: opts.req,
  })
}

export type Context = ReturnType<ReturnType<typeof createAppContext>>
```

### 4f. `src/server/trpc.ts`

Replace `@kyeotic/server`'s `createJwtVerifier` with `jose`; remove `superjson` transformer (flowchart doesn't use it — check if any client code depends on it first):
```ts
import { initTRPC, TRPCError } from '@trpc/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Context } from './context'

const AUTH_ISSUER = 'https://kyeotek-auth0.kye.dev/'
const AUTH_AUDIENCE = 'kyeotek'

const JWKS = createRemoteJWKSet(new URL(`${AUTH_ISSUER}.well-known/jwks.json`))

async function verifyJwt(authHeader: string) {
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
  })
  return payload
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const authProcedure = t.procedure.use(async function isAuthed(opts) {
  // ... same structure as before
})
```

**Important:** If the frontend tRPC client uses `superjson` as a transformer, keep it in both trpc.ts and the client config. If neither uses it, remove it from both. Check client code before removing.

### 4g. `src/server/users/userStore.ts`

Replace `@kyeotic/server/kv` helpers with the new `util/kv` helpers. Replace `Deno.Kv` with `KVNamespace`. Replace atomic transactions with sequential operations (use foodie's `../foodie/src/server/users/userStore.ts` as the reference — it's an exact match for this store's complexity):

Key changes:
- `constructor(private readonly kv: Deno.Kv)` → `constructor(private readonly kv: KVNamespace)`
- `makeSet('USERS')` → `makeKey('USERS', userId)`
- `kv.get<T>(key)?.value` → `kv.get<T>(makeKey(...), 'json')`
- Remove `associativeIndex` / `singularIndex` / `batchGet` from `@kyeotic/server/kv`; add inline sequential writes for external ID and username indexes (see foodie pattern)
- Remove `@kitsonk/kv-toolbox` imports
- Remove all `.ts` import extensions

### 4h. `src/server/players/playerStore.ts`

Simpler store — same pattern:
- `constructor(private readonly kv: KVNamespace)`
- `makeSet('PLAYERS')` → `makeKey('PLAYERS', userId, player.id)`
- `listAllValues(kv, PLAYERS(userId))` → `listAllValues(kv, makeKey('PLAYERS', userId) + ':')`
- `create(kv, key, player)` → `kvCreate(kv, key, player)`

### 4i. Add `src/server/webpush/` — pushforge web push

Create this entire directory following `../flowchart/src/server/webpush/` exactly. Files needed:

**`types.ts`** — copy from flowchart (WebPushSubscription, WebPushPayload schemas)

**`keys.ts`** — copy from flowchart; reads `env.WEBPUSH_KEYS_JSON` (a private ECDSA JWK stored as JSON string), derives the raw uncompressed P-256 public key using `rfc4648`:
```ts
import { base64url } from 'rfc4648'
import type { WorkerEnv } from '../types'

export async function getWebpushKeys(env: WorkerEnv) {
  const jwk = JSON.parse(env.WEBPUSH_KEYS_JSON) as JsonWebKey
  const x = base64url.parse(jwk.x as string, { loose: true })
  const y = base64url.parse(jwk.y as string, { loose: true })
  const raw = new Uint8Array(65)
  raw[0] = 0x04; raw.set(x, 1); raw.set(y, 33)
  const publicKey = base64url.stringify(raw, { pad: false })
  return { privateJWK: jwk, publicKey }
}
```

**`sendPush.ts`** — copy from flowchart; uses `buildPushHTTPRequest` from `@pushforge/builder`

**`pushStore.ts`** — copy from flowchart; replaces `FLOWCHART_KV` prefix with `PUSH`

**`routes.ts`** — copy from flowchart; exposes `getForUser`, `create`, `delete`, `sendTest`, `getVapidKey`

**`keygen.ts`** — copy from flowchart (the script that generates ECDSA P-256 key pair and prints `WEBPUSH_KEYS_JSON` and `publicKey`)

Add a `keygen` script to `package.json`:
```json
"keygen": "node --input-type=module < src/server/webpush/keygen.ts"
```
Or run via `npx tsx src/server/webpush/keygen.ts`.

### 4j. `src/server/server.ts` → `src/server/worker.ts`

Rename and rewrite:
```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { router } from './trpc'
import { createAppContext } from './context'
import { playerRouter } from './players/routes'
import { userRouter } from './users/userRoutes'
import { webPushRouter } from './webpush/routes'
import type { WorkerEnv } from './types'

const appRouter = router({
  players: playerRouter,
  users: userRouter,
  webpush: webPushRouter,
})

export type AppRouter = typeof appRouter

const app = new Hono<{ Bindings: WorkerEnv }>()

app.use('/api/*', cors())

app.all('/api/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api',
    req: c.req.raw,
    router: appRouter,
    createContext: createAppContext(c.env),
  })
})

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
```

Delete `src/server/server.ts`.

### 4k. Remove `.ts` import extensions

All internal imports like `import { foo } from './foo.ts'` → `import { foo } from './foo'`.

---

## Phase 5: Data Migration

**SKIP** — this is a template repo with no production data.

---

## Phase 6: Infra Migration

Update `infra/` to use Cloudflare Workers domain instead of the Deno Deploy module.

### `infra/main.tf`

Already has Cloudflare provider (`cloudflare/cloudflare ~> 4.0`) and `cloudflare_accounts` data source. No changes needed.

### `infra/dns.tf`

Replace the `module "domain"` (using `tf-deno-domain-cloudflare`) with `cloudflare_workers_domain`:
```hcl
data "cloudflare_zone" "domain" {
  name = var.zone_name
}

resource "cloudflare_workers_domain" "app" {
  account_id = local.cloudflare_account_id
  hostname   = var.domain_name
  service    = var.app_name
  zone_id    = data.cloudflare_zone.domain.id
}
```

### `infra/vars.tf`

- Remove `deno_deploy_acme` variable
- Add `app_name` variable (default `"APP_NAME"`)
- Keep `cloudflare_account_name` (default `"tim@kye.dev"`), `domain_name`, `zone_name`, `region`
- Add `cloudflare_api_token` sensitive variable if not already present

---

## Common Pitfalls

### tRPC client hitting wrong port in dev

**Fix:** Set `apiUrl` to `''` for localhost. This makes tRPC use `/api` as a relative path, routed through Vite's dev proxy to wrangler on `:8787`.

### superjson transformer

The current `trpc.ts` passes `transformer: superjson`. If the frontend `createTRPCClient` also specifies `transformer: superjson`, keep both in sync. If neither end actually needs it (no Dates, Sets, Maps being passed through tRPC), remove it from both server and client.

### Cloudflare Terraform — use smashdown/foodie as reference

- `cloudflare_account_name` default is `"tim@kye.dev"`
- Don't add a `cloudflare_zone_id` variable — look it up via `data "cloudflare_zone"` data source
- Mirror `../smashdown/infra/` or `../foodie/infra/` as the reference implementation

### Push key format

The old `WEBPUSH_KEYS_BASE64` was a base64-encoded blob. The new `WEBPUSH_KEYS_JSON` is a JSON-stringified ECDSA private JWK. Re-run `keygen.ts` to generate fresh keys in the new format. Never try to convert old base64 keys.

---

## Key Notes

- **Auth0** — no changes to Auth0 tenant config; JWKS endpoint and redirect URLs are unchanged.
- **`VITE_*` env vars** — compile-time only, baked into the JS bundle during `vite build`.
- **No `AUTH0_DOMAIN` runtime var** — issuer is hardcoded in `trpc.ts` (same as `../flowchart`). Remove from `wrangler dev --var` and config.
- **`WEBPUSH_KEYS_JSON`** — passed to `wrangler dev` via `--var`. In production, set as a Cloudflare Worker secret via `npm run push-secrets`.
- **`run_worker_first: true`** — worker handles `/api/*`, falls through to ASSETS for everything else (SPA 404→index.html).
- **No `nodejs_compat`** — Hono, jose, and @pushforge/builder all use Web APIs only.
- **No deploy step** — this is a template. Don't run `wrangler deploy` or `./infra/deploy`.
- **Delete `deno.json` and `deno.lock`** after all server code is migrated.
