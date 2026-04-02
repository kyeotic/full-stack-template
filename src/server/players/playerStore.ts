import { makeKey, type KvStore } from '../store/cloudflareKv'
import { Player } from './types'

export default class PlayerStore {
  constructor(private readonly kv: KvStore) {}

  async getForUser(userId: string): Promise<Player[]> {
    return await this.kv.listAllValues<Player>(makeKey('PLAYERS', userId) + ':')
  }

  async create(userId: string, player: Player): Promise<Player> {
    return await this.kv.create(makeKey('PLAYERS', userId, player.id), player)
  }
}
