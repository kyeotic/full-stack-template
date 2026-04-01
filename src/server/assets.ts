import type { Context } from 'hono'
import type { WorkerEnv } from './types'

export function CloudflareAssets() {
  return (c: Context<{ Bindings: WorkerEnv }>) => c.env.ASSETS.fetch(c.req.raw)
}
