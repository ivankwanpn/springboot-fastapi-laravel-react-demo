import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-in-production')
const expiration = process.env.JWT_EXPIRATION || '86400000' // 24h in ms

export async function signToken(payload: { sub: string; username: string; role: string }) {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${parseInt(expiration) / 1000}s`)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
  return {
    sub: payload.sub || '',
    username: payload.username as string,
    role: (payload.role as string) || 'ROLE_USER',
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}
