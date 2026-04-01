import { base64url } from 'rfc4648'

let _privateJWK: JsonWebKey | null = null
let _publicKey: string | null = null

export async function getWebpushKeys(keysJson: string) {
  if (_privateJWK) return { privateJWK: _privateJWK, publicKey: _publicKey! }

  // Stored secret is the private key JWK directly (x/y public coords are embedded per JWK spec)
  const jwk = JSON.parse(keysJson) as JsonWebKey

  // Derive raw uncompressed P-256 public key from the embedded x/y coordinates
  const x = base64url.parse(jwk.x as string, { loose: true })
  const y = base64url.parse(jwk.y as string, { loose: true })
  const raw = new Uint8Array(65)
  raw[0] = 0x04
  raw.set(x, 1)
  raw.set(y, 33)
  _publicKey = base64url.stringify(raw, { pad: false })

  _privateJWK = jwk

  return { privateJWK: _privateJWK, publicKey: _publicKey }
}
