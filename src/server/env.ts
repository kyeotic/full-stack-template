import type { WorkerEnv } from './types'

export interface AppEnv {
  webpushKeysJson: string
}

export class CloudflareEnv implements AppEnv {
  constructor(private readonly env: WorkerEnv) {}
  get webpushKeysJson() {
    return this.env.WEBPUSH_KEYS_JSON
  }
}
