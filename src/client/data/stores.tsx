import { type ParentProps } from 'solid-js'

import { requiredContext } from '../util/context'
import { useTrpc } from './trpc'

import { PlayerStore } from '../players/store'
import { UserStore } from '../user/store'

export interface Stores {
  players: PlayerStore
  user: UserStore
}

interface AppData {
  self: unknown
}

const { use: useStores, Provider: StoresProvider } = requiredContext<
  Stores,
  ParentProps
>('AppStores', (_props) => {
  const trpc = useTrpc()
  const appData = trpc.users.appData.query()

  return {
    players: new PlayerStore(trpc),
    user: new UserStore(
      trpc,
      appData.then((d: AppData) => d.self),
    ),
  } as Stores
})

export { StoresProvider, useStores }
