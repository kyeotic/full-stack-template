export interface KVStore {
  get<T>(key: string): Promise<T | null>
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  list(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string }[]
    cursor: string | null
    list_complete: boolean
  }>
}

export class CloudflareKV implements KVStore {
  constructor(private readonly ns: KVNamespace) {}
  get<T>(key: string) {
    return this.ns.get<T>(key, 'json')
  }
  async put(key: string, value: unknown) {
    await this.ns.put(key, JSON.stringify(value))
  }
  delete(key: string) {
    return this.ns.delete(key)
  }
  list(options: { prefix: string; cursor?: string }) {
    return this.ns.list(options) as Promise<{
      keys: { name: string }[]
      cursor: string | null
      list_complete: boolean
    }>
  }
}

export function makeKey(...parts: string[]): string {
  return parts.join(':')
}

export async function listAllKeys(
  kv: KVStore,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = []
  let cursor: string | undefined

  do {
    const result = await kv.list({
      prefix,
      ...(cursor ? { cursor } : {}),
    })
    keys.push(...result.keys.map((k) => k.name))
    cursor = result.list_complete ? undefined : (result.cursor ?? undefined)
  } while (cursor)

  return keys
}

export async function listAllValues<T>(
  kv: KVStore,
  prefix: string,
): Promise<T[]> {
  const keys = await listAllKeys(kv, prefix)
  const values = await Promise.all(keys.map((k) => kv.get<T>(k)))
  return values.filter((v) => v !== null) as T[]
}

export async function batchGet<T>(kv: KVStore, keys: string[]): Promise<T[]> {
  const values = await Promise.all(keys.map((k) => kv.get<T>(k)))
  return values.filter((v) => v !== null) as T[]
}

export async function kvCreate<T>(
  kv: KVStore,
  key: string,
  value: T,
): Promise<T> {
  const existing = await kv.get(key)
  if (existing !== null) throw new Error(`Record already exists: ${key}`)
  await kv.put(key, value)
  return value
}

export async function kvPut<T>(kv: KVStore, key: string, value: T): Promise<T> {
  await kv.put(key, value)
  return value
}

export async function kvUpdate<T>(
  kv: KVStore,
  key: string,
  value: T,
): Promise<T> {
  const existing = await kv.get(key)
  if (existing === null) throw new Error(`Record not found: ${key}`)
  await kv.put(key, value)
  return value
}
