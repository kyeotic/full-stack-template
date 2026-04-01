import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { router } from './trpc'
import { createAppContext } from './context'
import { playerRouter } from './players/routes'
import { userRouter } from './users/userRoutes'
import { webPushRouter } from './webpush/routes'
import type { WorkerEnv } from './types'
import { CloudflareEnv } from './env'
import { CloudflareKV } from './util/kv'
import { CloudflareAssets } from './assets'
import { Auth0JwtVerifier } from './auth/jwt'

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
    createContext: createAppContext(
      new CloudflareEnv(c.env),
      new CloudflareKV(c.env.APP_NAME_KV),
      new Auth0JwtVerifier(),
    ),
  })
})

app.get('*', (c) => new CloudflareAssets(c.env.ASSETS).fetch(c.req.raw))

export default app
