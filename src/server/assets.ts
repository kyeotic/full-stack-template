export interface AssetFetcher {
  fetch(req: Request): Promise<Response>
}

export class CloudflareAssets implements AssetFetcher {
  constructor(private readonly assets: Fetcher) {}
  fetch(req: Request) {
    return this.assets.fetch(req)
  }
}
