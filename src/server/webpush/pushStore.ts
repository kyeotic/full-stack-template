import {
  makeKey,
  listAllValues,
  kvCreate,
  kvUpdate,
  type KVStore,
} from '../util/kv'
import { WebPushSubscription } from './types'

type Sub = WebPushSubscription

export default class PushStore {
  constructor(private readonly kv: KVStore) {}

  async getForUser(userId: string): Promise<Sub[]> {
    return await listAllValues<Sub>(this.kv, makeKey('PUSH', userId) + ':')
  }

  async create(userId: string, sub: Sub): Promise<Sub> {
    return await kvCreate(this.kv, makeKey('PUSH', userId, sub.id), sub)
  }

  async update(userId: string, sub: Sub): Promise<Sub> {
    return await kvUpdate(this.kv, makeKey('PUSH', userId, sub.id), sub)
  }

  async delete(userId: string, subscriptionId: string): Promise<void> {
    await this.kv.delete(makeKey('PUSH', userId, subscriptionId))
  }
}
