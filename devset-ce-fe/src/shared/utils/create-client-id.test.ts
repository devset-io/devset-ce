import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClientId } from './create-client-id'

describe('createClientId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a UUID when crypto.randomUUID is available', () => {
    expect(createClientId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('falls back to a hex-based id when randomUUID is unavailable (non-HTTPS context)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    })

    expect(createClientId()).toMatch(/^id-[0-9a-z]+-[0-9a-f]{16}$/)
  })

  it('returns different values across calls', () => {
    expect(createClientId()).not.toBe(createClientId())
  })
})
