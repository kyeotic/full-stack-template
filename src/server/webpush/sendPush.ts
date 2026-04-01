import { buildPushHTTPRequest } from '@pushforge/builder'
import { getWebpushKeys } from './keys'
import { WebPushPayload, WebPushSubscription } from './types'

export class DeadSubscriptionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'DeadSubscriptionError'
  }
}

export async function sendPush(
  keysJson: string,
  sub: WebPushSubscription,
  payload: WebPushPayload,
): Promise<void> {
  const { privateJWK } = await getWebpushKeys(keysJson)
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK,
    subscription: sub,
    message: {
      payload,
      adminContact: 'mailto:tim@kye.dev',
      options: { ttl: 86400, urgency: 'high' },
    },
  })

  const response = await fetch(endpoint, { method: 'POST', headers, body })

  if (!response.ok) {
    if (response.status === 410 || response.status === 401) {
      throw new DeadSubscriptionError(
        response.status,
        `Push subscription dead: ${response.status} ${response.statusText}`,
      )
    }
    const text = await response.text().catch(() => '')
    throw new Error(
      `Push service rejected message: ${response.status} ${response.statusText} - ${text}`,
    )
  }
}
