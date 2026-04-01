import { z } from 'zod'

export const WebPushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  expirationTime: z.nullable(z.number()).optional(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
})

export type WebPushSubscription = z.infer<typeof WebPushSubscriptionSchema>

export const PushSubscriptionSchema = WebPushSubscriptionSchema.omit({
  id: true,
})
export type PushSubscription = z.infer<typeof PushSubscriptionSchema>

export const WebPushPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
})

export type WebPushPayload = z.infer<typeof WebPushPayloadSchema>
