import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { authConfig } from '../config'

export interface JwtVerifier {
  verify(authHeader: string): Promise<JWTPayload>
}

export class Auth0JwtVerifier implements JwtVerifier {
  private readonly jwks = createRemoteJWKSet(
    new URL(`${authConfig.issuer}.well-known/jwks.json`),
  )
  async verify(authHeader: string): Promise<JWTPayload> {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    })
    return payload
  }
}
