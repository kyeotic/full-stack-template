import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { AppConfig } from './config'
import type { KvStore } from './store/cloudflareKv'
import type { JwtVerifier } from './auth/jwt'
import UserStore from './users/userStore'
import PlayerStore from './players/playerStore'
import PushStore from './webpush/pushStore'

export function createAppContext(
  config: AppConfig,
  kv: KvStore,
  jwtVerifier: JwtVerifier,
) {
  return (opts: FetchCreateContextFnOptions) => ({
    config,
    jwtVerifier,
    stores: {
      users: new UserStore(kv),
      players: new PlayerStore(kv),
      push: new PushStore(kv),
    },
    req: opts.req,
  })
}

export type Context = ReturnType<ReturnType<typeof createAppContext>>
