import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { createAppContext } from './context'
import { appRouter } from './router'
import type { WorkerEnv } from './types'
import type { AppEnv } from './env'
import type { KVStore } from './util/kv'
import { CloudflareAssets } from './assets'
import { Auth0JwtVerifier } from './auth/jwt'

class CloudflareEnv implements AppEnv {
  constructor(private readonly env: WorkerEnv) {}
  get webpushKeysJson() {
    return this.env.WEBPUSH_KEYS_JSON
  }
}

class CloudflareKV implements KVStore {
  constructor(private readonly ns: KVNamespace) {}
  get<T>(key: string) {
    return this.ns.get<T>(key, 'json')
  }
  async put(key: string, value: unknown) {
    await this.ns.put(key, JSON.stringify(value))
  }
  delete(key: string) {
    return this.ns.delete(key)
  }
  list(options: { prefix: string; cursor?: string }) {
    return this.ns.list(options) as Promise<{
      keys: { name: string }[]
      cursor: string | null
      list_complete: boolean
    }>
  }
}

const app = new Hono<{ Bindings: WorkerEnv }>()

app.use('/api/*', cors())

app.all('/api/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api',
    req: c.req.raw,
    router: appRouter,
    createContext: createAppContext(
      new CloudflareEnv(c.env),
      new CloudflareKV(c.env.APP_NAME_KV),
      new Auth0JwtVerifier(),
    ),
  })
})

app.get('*', CloudflareAssets())

export default app
