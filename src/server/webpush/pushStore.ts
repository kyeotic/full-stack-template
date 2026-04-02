import { makeKey, type KvStore } from '../store/cloudflareKv'
import { WebPushSubscription } from './types'

type Sub = WebPushSubscription

export default class PushStore {
  constructor(private readonly kv: KvStore) {}

  async getForUser(userId: string): Promise<Sub[]> {
    return await this.kv.listAllValues<Sub>(makeKey('PUSH', userId) + ':')
  }

  async create(userId: string, sub: Sub): Promise<Sub> {
    return await this.kv.create(makeKey('PUSH', userId, sub.id), sub)
  }

  async update(userId: string, sub: Sub): Promise<Sub> {
    return await this.kv.update(makeKey('PUSH', userId, sub.id), sub)
  }

  async delete(userId: string, subscriptionId: string): Promise<void> {
    await this.kv.delete(makeKey('PUSH', userId, subscriptionId))
  }
}
