import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateUuid, randomLowercaseId } from './random'

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomLowercaseId', () => {
  it('returns a string of the requested length', () => {
    expect(randomLowercaseId(7)).toHaveLength(7)
    expect(randomLowercaseId(3)).toHaveLength(3)
  })

  it('returns an empty string for length 0', () => {
    expect(randomLowercaseId(0)).toBe('')
  })

  it('only contains lowercase letters and digits', () => {
    expect(randomLowercaseId(64)).toMatch(/^[a-z0-9]+$/)
  })

  it('returns different values across calls', () => {
    expect(randomLowercaseId(20)).not.toBe(randomLowercaseId(20))
  })
})

describe('generateUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a v4 UUID', () => {
    expect(generateUuid()).toMatch(UUID_V4_PATTERN)
  })

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555')
    vi.stubGlobal('crypto', { ...globalThis.crypto, getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto), randomUUID })

    expect(generateUuid()).toBe('11111111-2222-4333-8444-555555555555')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('falls back to getRandomValues when randomUUID is unavailable (non-HTTPS context)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    })

    expect(generateUuid()).toMatch(UUID_V4_PATTERN)
  })

  it('fallback returns different values across calls', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    })

    expect(generateUuid()).not.toBe(generateUuid())
  })
})
