import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { createAppContext } from './context'
import { appRouter } from './router'
import { createConfig, type WorkerEnv } from './config'
import { CloudflareKv } from './store/cloudflareKv'
import { Auth0JwtVerifier } from './auth/jwt'

// This is the CLOUDFLARE runtime
// ALL knowledge of cloudflare should live here
// the rest of the codebase should be agnostic to it
// That way other runtimes can use other entrypoints without needing to change the rest of the codebase

const app = new Hono<{ Bindings: WorkerEnv }>()

app.use('/api/*', cors())

app.all('/api/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api',
    req: c.req.raw,
    router: appRouter,
    createContext: createAppContext(
      createConfig(c.env),
      new CloudflareKv(c.env.APP_NAME_KV),
      new Auth0JwtVerifier(),
    ),
  })
})

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
