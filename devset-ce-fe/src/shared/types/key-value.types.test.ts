import { describe, expect, it } from 'vitest'
import { parseKeyValue, serializeKeyValue, formatKeyValueDisplay, EMPTY_KEY } from './key-value.types'

describe('parseKeyValue', () => {
  it('returns empty literal for null', () => {
    expect(parseKeyValue(null)).toEqual({ kind: 'literal', value: '' })
  })

  it('returns empty literal for undefined', () => {
    expect(parseKeyValue(undefined)).toEqual({ kind: 'literal', value: '' })
  })

  it('parses a plain string as literal', () => {
    expect(parseKeyValue('user-123')).toEqual({ kind: 'literal', value: 'user-123' })
  })

  it('parses { $ref: ... } as ref', () => {
    expect(parseKeyValue({ $ref: 'currentEvent.userId' })).toEqual({ kind: 'ref', value: 'currentEvent.userId' })
  })

  it('parses { $fn: ... } as fn', () => {
    expect(parseKeyValue({ $fn: 'uuid()' })).toEqual({ kind: 'fn', value: 'uuid()' })
  })

  it('handles $ref with null value', () => {
    expect(parseKeyValue({ $ref: null })).toEqual({ kind: 'ref', value: '' })
  })

  it('falls back to JSON.stringify for unknown objects', () => {
    const raw = { foo: 'bar' }
    expect(parseKeyValue(raw)).toEqual({ kind: 'literal', value: '{"foo":"bar"}' })
  })
})

describe('serializeKeyValue', () => {
  it('returns null for undefined', () => {
    expect(serializeKeyValue(undefined)).toBeNull()
  })

  it('returns null for empty literal', () => {
    expect(serializeKeyValue({ kind: 'literal', value: '' })).toBeNull()
  })

  it('returns null for whitespace-only literal', () => {
    expect(serializeKeyValue({ kind: 'literal', value: '   ' })).toBeNull()
  })

  it('returns trimmed string for literal', () => {
    expect(serializeKeyValue({ kind: 'literal', value: ' user-123 ' })).toBe('user-123')
  })

  it('returns { $ref } for ref', () => {
    expect(serializeKeyValue({ kind: 'ref', value: 'currentEvent.userId' })).toEqual({ $ref: 'currentEvent.userId' })
  })

  it('returns { $fn } for fn', () => {
    expect(serializeKeyValue({ kind: 'fn', value: 'uuid()' })).toEqual({ $fn: 'uuid()' })
  })

  it('returns null for empty ref', () => {
    expect(serializeKeyValue({ kind: 'ref', value: '' })).toBeNull()
  })
})

describe('serializeKeyValue / parseKeyValue round-trip', () => {
  it('round-trips a literal', () => {
    const kv = { kind: 'literal' as const, value: 'user-123' }
    expect(parseKeyValue(serializeKeyValue(kv))).toEqual(kv)
  })

  it('round-trips a $ref', () => {
    const kv = { kind: 'ref' as const, value: 'currentEvent.userId' }
    expect(parseKeyValue(serializeKeyValue(kv))).toEqual(kv)
  })

  it('round-trips a $fn', () => {
    const kv = { kind: 'fn' as const, value: 'uuid()' }
    expect(parseKeyValue(serializeKeyValue(kv))).toEqual(kv)
  })

  it('round-trips null → EMPTY_KEY', () => {
    expect(parseKeyValue(serializeKeyValue(undefined))).toEqual(EMPTY_KEY)
  })
})

describe('formatKeyValueDisplay', () => {
  it('returns empty string for empty value', () => {
    expect(formatKeyValueDisplay({ kind: 'literal', value: '' })).toBe('')
  })

  it('returns raw value for literal', () => {
    expect(formatKeyValueDisplay({ kind: 'literal', value: 'user-123' })).toBe('user-123')
  })

  it('formats $ref', () => {
    expect(formatKeyValueDisplay({ kind: 'ref', value: 'currentEvent.userId' })).toBe('$ref(currentEvent.userId)')
  })

  it('formats $fn', () => {
    expect(formatKeyValueDisplay({ kind: 'fn', value: 'uuid()' })).toBe('$fn(uuid())')
  })
})
