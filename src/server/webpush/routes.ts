import { z } from 'zod'
import { nanoid } from 'nanoid'

import { router, authProcedure, publicProcedure } from '../trpc'
import { PushSubscriptionSchema } from './types'
import { getWebpushKeys } from './keys'
import { sendPush } from './sendPush'

export const webPushRouter = router({
  getForUser: authProcedure.query(async ({ ctx: { user, stores } }) => {
    return await stores.push.getForUser(user.id)
  }),
  create: authProcedure
    .input(PushSubscriptionSchema)
    .mutation(async ({ input, ctx: { user, stores, config } }) => {
      console.log('[webpush] create: storing subscription for user', user.id)
      const newSub = await stores.push.create(user.id, {
        ...input,
        id: nanoid(),
      })
      console.log(
        '[webpush] create: kv write succeeded, key:',
        `PUSH:${user.id}:${newSub.id}`,
      )

      try {
        await sendPush(config.webpushKeysJson, newSub, {
          title: 'Subscribed',
          body: 'You are now subscribed to Push Notifications',
        })
        console.log('[webpush] create: sendPush succeeded')
      } catch (err) {
        console.error('[webpush] create: sendPush failed', err)
        throw err
      }

      return newSub
    }),
  delete: authProcedure
    .input(z.string())
    .mutation(async ({ input: id, ctx: { user, stores } }) => {
      return await stores.push.delete(user.id, id)
    }),
  sendTest: authProcedure
    .input(z.string())
    .mutation(async ({ input: id, ctx: { user, stores, config } }) => {
      const subs = await stores.push.getForUser(user.id)
      const sub = subs.find((s) => s.id === id)
      if (!sub) {
        throw new Error('Subscription not found')
      }
      await sendPush(config.webpushKeysJson, sub, {
        title: 'Test Notification',
        body: 'This is a test push notification',
      })
    }),
  getVapidKey: publicProcedure.query(async ({ ctx: { config } }) => {
    const { publicKey } = await getWebpushKeys(config.webpushKeysJson)
    return publicKey
  }),
})
