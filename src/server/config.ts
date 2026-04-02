import type { Fetcher, KVNamespace } from '@cloudflare/workers-types'

export interface WorkerEnv {
  APP_NAME_KV: KVNamespace
  ASSETS: Fetcher
  WEBPUSH_KEYS_JSON: string
}

export interface AppConfig {
  webpushKeysJson: string
}

export function createConfig(env: WorkerEnv): AppConfig {
  return {
    webpushKeysJson: env.WEBPUSH_KEYS_JSON,
  }
}

export const authConfig = {
  audience: 'kyeotek',
  issuer: 'https://kyeotek-auth0.kye.dev/',
} as const
