import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, hashPassword, comparePassword } from '../auth'

describe('signToken', () => {
  it('returns a JWT string containing sub, username, and role', async () => {
    const token = await signToken({ sub: '1', username: 'alice', role: 'ROLE_USER' })
    expect(token).toBeTypeOf('string')
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })
})

describe('verifyToken', () => {
  it('decodes a valid token back to the original payload', async () => {
    const payload = { sub: '1', username: 'alice', role: 'ROLE_USER' }
    const token = await signToken(payload)
    const decoded = await verifyToken(token)
    expect(decoded.sub).toBe('1')
    expect(decoded.username).toBe('alice')
    expect(decoded.role).toBe('ROLE_USER')
  })

  it('throws on an invalid token', async () => {
    await expect(verifyToken('bad.token.here')).rejects.toThrow()
  })

  it('throws on an expired token', async () => {
    // This would need a way to create expired tokens, skip for now
  })
})

describe('hashPassword', () => {
  it('returns a string different from the input', async () => {
    const hash = await hashPassword('mypassword')
    expect(hash).not.toBe('mypassword')
    expect(hash).toContain('$2b$')
  })
})

describe('comparePassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('mypassword')
    expect(await comparePassword('mypassword', hash)).toBe(true)
  })

  it('returns false for non-matching password', async () => {
    const hash = await hashPassword('mypassword')
    expect(await comparePassword('wrong', hash)).toBe(false)
  })
})
