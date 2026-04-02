import { KvStore } from './KvStore'
import type { KVNamespace } from '@cloudflare/workers-types'

export { KvStore, makeKey } from './KvStore'

export class CloudflareKv extends KvStore {
  constructor(private readonly ns: KVNamespace) {
    super()
  }
  get<T>(key: string) {
    return this.ns.get<T>(key, 'json')
  }
  async put(key: string, value: unknown) {
    await this.ns.put(key, JSON.stringify(value))
  }
  delete(key: string) {
    return this.ns.delete(key)
  }
  async list(options: { prefix: string; cursor?: string }) {
    const result = await this.ns.list(options)
    return {
      keys: result.keys as { name: string }[],
      cursor: result.list_complete ? null : result.cursor,
      hasMore: !result.list_complete,
    }
  }
}
