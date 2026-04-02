export abstract class KvStore {
  abstract get<T>(key: string): Promise<T | null>
  abstract put(key: string, value: unknown): Promise<void>
  abstract delete(key: string): Promise<void>
  abstract list(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string }[]
    cursor: string | null
    hasMore: boolean
  }>

  async listAllKeys(prefix: string): Promise<string[]> {
    const keys: string[] = []
    let cursor: string | undefined

    do {
      const result = await this.list({
        prefix,
        ...(cursor ? { cursor } : {}),
      })
      keys.push(...result.keys.map((k) => k.name))
      cursor = result.hasMore ? (result.cursor ?? undefined) : undefined
    } while (cursor)

    return keys
  }

  async listAllValues<T>(prefix: string): Promise<T[]> {
    const keys = await this.listAllKeys(prefix)
    const values = await Promise.all(keys.map((k) => this.get<T>(k)))
    return values.filter((v) => v !== null) as T[]
  }

  async batchGet<T>(keys: string[]): Promise<T[]> {
    const values = await Promise.all(keys.map((k) => this.get<T>(k)))
    return values.filter((v) => v !== null) as T[]
  }

  async create<T>(key: string, value: T): Promise<T> {
    const existing = await this.get(key)
    if (existing !== null) throw new Error(`Record already exists: ${key}`)
    await this.put(key, value)
    return value
  }

  async update<T>(key: string, value: T): Promise<T> {
    const existing = await this.get(key)
    if (existing === null) throw new Error(`Record not found: ${key}`)
    await this.put(key, value)
    return value
  }
}

export function makeKey(...parts: string[]): string {
  return parts.join(':')
}
