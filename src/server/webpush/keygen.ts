function encodeBase64Url(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function decodeBase64Url(s: string): Uint8Array {
  const b64 =
    s.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

// VAPID signing requires ECDSA; ECDH keys would conflict with pushforge's importKey call
const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
)

const publicJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
const privateJWK = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

// Stored format is the private JWK directly; x/y public coords are embedded per JWK spec
const keysJson = JSON.stringify(privateJWK)

// Build raw uncompressed P-256 public key from JWK x/y (ECDSA keys don't support raw export)
const x = decodeBase64Url(publicJWK.x as string)
const y = decodeBase64Url(publicJWK.y as string)
const rawKey = new Uint8Array(65)
rawKey[0] = 0x04
rawKey.set(x, 1)
rawKey.set(y, 33)
const publicKey = encodeBase64Url(rawKey)

console.log('WEBPUSH_KEYS_JSON', keysJson)
console.log('publicKey', publicKey)
