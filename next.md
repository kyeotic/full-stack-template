# Next Steps

## Phase 7: ESLint Setup

- [x] Add ESLint devDependencies to `package.json`:
  - `eslint`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-prettier`
- [x] Create `eslint.config.js` (flat config):

```js
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier/recommended'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: { ...tsPlugin.configs.recommended.rules },
  },
  prettierConfig,
  prettierPlugin,
]
```

- [x] Add lint scripts to `package.json`:

```json
"lint": "eslint src",
"lint:ci": "eslint src --max-warnings 0"
```

Note: `.prettierrc.json` already exists with correct settings — no changes needed.

---

## Phase 8: Hexagonal Architecture

### 8a. KV Abstraction — `src/server/util/kv.ts`

Add a runtime-agnostic `KVStore` interface and a `CloudflareKV` adapter. All helper functions switch from `KVNamespace` → `KVStore`. This means a future Deno adapter only needs to implement the interface — no store changes required.

```ts
export interface KVStore {
  get<T>(key: string): Promise<T | null>
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  list(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string }[]
    cursor: string | null
    list_complete: boolean
  }>
}

export class CloudflareKV implements KVStore {
  constructor(private readonly ns: KVNamespace) {}
  get<T>(key: string) { return this.ns.get<T>(key, 'json') }
  async put(key: string, value: unknown) { await this.ns.put(key, JSON.stringify(value)) }
  delete(key: string) { return this.ns.delete(key) }
  list(options: { prefix: string; cursor?: string }) { return this.ns.list(options) as Promise<...> }
}
```

Update all helpers (`listAllKeys`, `listAllValues`, `batchGet`, `kvCreate`, `kvPut`, `kvUpdate`) to use `KVStore` instead of `KVNamespace`.

Update stores to use `KVStore`:
- `src/server/users/userStore.ts` — constructor + `kv.get<T>(key, 'json')` → `kv.get<T>(key)`
- `src/server/players/playerStore.ts` — constructor only
- `src/server/webpush/pushStore.ts` — constructor only

### 8b. ENV Encapsulation — new `src/server/env.ts`

Interface for all runtime env var access. `worker.ts` is the only file that touches `WorkerEnv`.

```ts
export interface AppEnv {
  webpushKeysJson: string
}

export class CloudflareEnv implements AppEnv {
  constructor(private readonly env: WorkerEnv) {}
  get webpushKeysJson() { return this.env.WEBPUSH_KEYS_JSON }
}
```

### 8c. Asset Fetcher — new `src/server/assets.ts`

Interface for static asset serving.

```ts
export interface AssetFetcher {
  fetch(req: Request): Promise<Response>
}

export class CloudflareAssets implements AssetFetcher {
  constructor(private readonly assets: Fetcher) {}
  fetch(req: Request) { return this.assets.fetch(req) }
}
```

### 8d. JWT Verification — new `src/server/auth/jwt.ts`

Pulls `verifyJwt` + JWKS out of `trpc.ts` into an injectable interface.

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface JwtVerifier {
  verify(authHeader: string): Promise<JWTPayload>
}

export class Auth0JwtVerifier implements JwtVerifier {
  private readonly jwks = createRemoteJWKSet(new URL(`${AUTH_ISSUER}.well-known/jwks.json`))
  async verify(authHeader: string): Promise<JWTPayload> {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    const { payload } = await jwtVerify(token, this.jwks, { issuer: AUTH_ISSUER, audience: AUTH_AUDIENCE })
    return payload
  }
}
```

`trpc.ts` uses `ctx.jwtVerifier.verify(authHeader)` instead of the inline `verifyJwt`.

### Wiring — `src/server/context.ts` and `src/server/worker.ts`

`context.ts` takes the three abstractions as separate parameters:

```ts
export function createAppContext(env: AppEnv, kv: KVStore, jwtVerifier: JwtVerifier) {
  return (opts: FetchCreateContextFnOptions) => ({
    env,
    jwtVerifier,
    stores: { users: new UserStore(kv), players: new PlayerStore(kv), push: new PushStore(kv) },
    req: opts.req,
  })
}
```

`worker.ts` constructs all CF implementations and is the only file that imports `WorkerEnv`:

```ts
app.all('/api/*', async (c) => {
  return fetchRequestHandler({
    ...
    createContext: createAppContext(
      new CloudflareEnv(c.env),
      new CloudflareKV(c.env.APP_NAME_KV),
      new Auth0JwtVerifier(),
    ),
  })
})
app.get('*', (c) => new CloudflareAssets(c.env.ASSETS).fetch(c.req.raw))
```

Update dependents:

| File | Change |
|---|---|
| `src/server/config.ts` | Remove unused `getConfig(env: WorkerEnv)`; keep `authConfig` |
| `src/server/webpush/keys.ts` | `getWebpushKeys(env: WorkerEnv)` → `getWebpushKeys(keysJson: string)` |
| `src/server/webpush/sendPush.ts` | `sendPush(env: WorkerEnv, ...)` → `sendPush(keysJson: string, ...)` |
| `src/server/webpush/routes.ts` | `ctx.env` → `ctx.env.webpushKeysJson` (same field name, now typed to `AppEnv`) |
| `src/server/trpc.ts` | Remove inline `verifyJwt`/JWKS; use `ctx.jwtVerifier.verify(authHeader)` |

---

## Other Encapsulation Opportunities (future consideration)

| Concern | Current State | What Would Help |
|---|---|---|
| **Push sending** | `sendPush(keysJson, sub, payload)` in `sendPush.ts` | Already well-isolated; a `PushSender` interface only if multiple backends are needed |
| **ID generation** | `nanoid()` inline in routes/stores | Injecting an `IdGenerator` would enable unit testing without module mocks — probably overkill for a template |

Already portable (zero migration pain): `fetch`, Web Crypto API, Hono (multi-runtime), `jose`, tRPC fetch adapter.

---

## Verification

```sh
npm run build              # Vite frontend build
npx tsc -p tsconfig.worker.json --noEmit  # worker type check
npx tsc --noEmit           # client type check
npm run lint:ci            # ESLint zero warnings
```
