import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { AppEnv } from './env'
import type { KVStore } from './util/kv'
import type { JwtVerifier } from './auth/jwt'
import UserStore from './users/userStore'
import PlayerStore from './players/playerStore'
import PushStore from './webpush/pushStore'

export function createAppContext(
  env: AppEnv,
  kv: KVStore,
  jwtVerifier: JwtVerifier,
) {
  return (opts: FetchCreateContextFnOptions) => ({
    env,
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
