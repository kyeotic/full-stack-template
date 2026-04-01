import { router } from './trpc'
import { playerRouter } from './players/routes'
import { userRouter } from './users/userRoutes'
import { webPushRouter } from './webpush/routes'

export const appRouter = router({
  players: playerRouter,
  users: userRouter,
  webpush: webPushRouter,
})

export type AppRouter = typeof appRouter
