import type { JWTPayload } from 'jose'
import { nanoid } from 'nanoid'
import {
  makeKey,
  listAllValues,
  batchGet,
  kvCreate,
  kvPut,
  type KVStore,
} from '../util/kv'
import { authConfig } from '../config'
import { User, UserProfile } from './types'

const AUTH0_SOURCE = 'auth0-kyeotek'

interface ExternalIdRef {
  userId: string
}

export default class UserStore {
  constructor(private readonly kv: KVStore) {}

  async getAll(): Promise<User[]> {
    return await listAllValues<User>(this.kv, 'USERS:')
  }

  async get(userId: string): Promise<User | null> {
    return await this.kv.get<User>(makeKey('USERS', userId))
  }

  async batchGet(userIds: string[]): Promise<User[]> {
    return await batchGet<User>(
      this.kv,
      userIds.map((u) => makeKey('USERS', u)),
    )
  }

  async create(user: User): Promise<User> {
    if (!user.id) throw new Error('id is required')

    await kvCreate(this.kv, makeKey('USERS', user.id), user)

    for (const ext of user.externalIds) {
      await kvPut<ExternalIdRef>(
        this.kv,
        makeKey('EX_ID', ext.source, ext.id),
        { userId: user.id },
      )
    }

    if (user.profile.username) {
      await kvPut<ExternalIdRef>(
        this.kv,
        makeKey('USERNAMES', user.profile.username),
        { userId: user.id },
      )
    }

    return user
  }

  async initUser(token: JWTPayload): Promise<User> {
    if (token.iss !== authConfig.issuer)
      throw new Error('Unsupported external source')

    const externalId = token.sub!

    const dbUser = await this.getByExternalIdentifier(AUTH0_SOURCE, externalId)
    if (dbUser) return dbUser

    const newUser: User = {
      id: nanoid(),
      externalIds: [{ source: AUTH0_SOURCE, id: externalId }],
      profile: {
        email: null,
        username: null,
      },
    }

    await this.create(newUser)

    return newUser
  }

  async update(user: User): Promise<User> {
    if (!user.id) throw new Error('id is required')

    const existing = await this.get(user.id)
    if (!existing) throw new Error('User not found')

    await kvPut(this.kv, makeKey('USERS', user.id), user)

    for (const ext of existing.externalIds) {
      const stillPresent = user.externalIds.some(
        (e) => e.source === ext.source && e.id === ext.id,
      )
      if (!stillPresent) {
        await this.kv.delete(makeKey('EX_ID', ext.source, ext.id))
      }
    }
    for (const ext of user.externalIds) {
      await kvPut<ExternalIdRef>(
        this.kv,
        makeKey('EX_ID', ext.source, ext.id),
        { userId: user.id },
      )
    }

    if (
      existing.profile.username &&
      existing.profile.username !== user.profile.username
    ) {
      await this.kv.delete(makeKey('USERNAMES', existing.profile.username))
    }
    if (user.profile.username) {
      await kvPut<ExternalIdRef>(
        this.kv,
        makeKey('USERNAMES', user.profile.username),
        { userId: user.id },
      )
    }

    return user
  }

  async updateProfile(userId: string, profile: UserProfile): Promise<void> {
    const user = await this.get(userId)
    if (!user) throw new Error('user does not exist')
    await this.update({ ...user, profile })
  }

  async getByExternalIdentifier(
    source: string,
    externalId: string,
  ): Promise<User | null> {
    const ref = await this.kv.get<ExternalIdRef>(
      makeKey('EX_ID', source, externalId),
    )
    if (!ref) return null
    return await this.get(ref.userId)
  }

  async getByUsername(username: string): Promise<User | null> {
    const ref = await this.kv.get<ExternalIdRef>(makeKey('USERNAMES', username))
    if (!ref) return null
    return await this.get(ref.userId)
  }
}
