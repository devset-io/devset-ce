/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import {
  collectionContextFieldNames,
  entriesToMap,
  entryValueToMapValue,
  mapToEntries,
  mapValueToEntryValue,
} from './collectionContext.utils'
import type { QueryValue } from '../../../../../flow-builder/types'
import type { CollectionContextEntry } from '../../state/MessageDispatch.types'

// ── round trips: entry → map → entry ─────────────────────────

describe('entryValueToMapValue ↔ mapValueToEntryValue round-trip', () => {
  it('preserves path values via $ref map', () => {
    const original: QueryValue = { kind: 'path', value: 'foo.bar' }
    const encoded = entryValueToMapValue(original)
    expect(encoded).toEqual({ $ref: 'foo.bar' })
    expect(mapValueToEntryValue(encoded)).toEqual(original)
  })

  it('preserves fn values via $fn map', () => {
    const original: QueryValue = { kind: 'fn', value: 'now()' }
    const encoded = entryValueToMapValue(original)
    expect(encoded).toEqual({ $fn: 'now()' })
    expect(mapValueToEntryValue(encoded)).toEqual(original)
  })

  it('preserves literal numbers as native JSON', () => {
    const original: QueryValue = { kind: 'literal', value: 42 }
    expect(entryValueToMapValue(original)).toBe(42)
    expect(mapValueToEntryValue(42)).toEqual(original)
  })

  it('preserves literal zero (falsy but not null)', () => {
    const original: QueryValue = { kind: 'literal', value: 0 }
    expect(entryValueToMapValue(original)).toBe(0)
    expect(mapValueToEntryValue(0)).toEqual(original)
  })

  it('preserves literal booleans', () => {
    expect(entryValueToMapValue({ kind: 'literal', value: true })).toBe(true)
    expect(mapValueToEntryValue(true)).toEqual({ kind: 'literal', value: true })

    expect(entryValueToMapValue({ kind: 'literal', value: false })).toBe(false)
    expect(mapValueToEntryValue(false)).toEqual({ kind: 'literal', value: false })
  })

  it('preserves literal null', () => {
    const original: QueryValue = { kind: 'literal', value: null }
    expect(entryValueToMapValue(original)).toBeNull()
    expect(mapValueToEntryValue(null)).toEqual(original)
  })

  it('preserves plain literal strings', () => {
    const original: QueryValue = { kind: 'literal', value: 'hello world' }
    expect(entryValueToMapValue(original)).toBe('hello world')
    expect(mapValueToEntryValue('hello world')).toEqual(original)
  })

  it('preserves the empty literal string', () => {
    const original: QueryValue = { kind: 'literal', value: '' }
    expect(entryValueToMapValue(original)).toBe('')
    expect(mapValueToEntryValue('')).toEqual(original)
  })

  it('coerces literal undefined to null when encoding', () => {
    expect(entryValueToMapValue({ kind: 'literal', value: undefined })).toBeNull()
  })
})

// ── strings are always literals now ─────────────────────────
//
// The previous encoding overloaded `${...}` and `=...` as path/fn markers.
// With the DSL-map encoding the radio button disambiguates intent, so
// any persisted string is unambiguously a literal — even strings that
// happen to look like the old markers.

describe('mapValueToEntryValue treats every string as a literal', () => {
  it('decodes "=foo" as a literal string (no fn marker)', () => {
    expect(mapValueToEntryValue('=foo')).toEqual({ kind: 'literal', value: '=foo' })
  })

  it('decodes "${x}" as a literal string (no path marker)', () => {
    expect(mapValueToEntryValue('${x}')).toEqual({ kind: 'literal', value: '${x}' })
  })

  it('decodes a multi-key object as a literal (only single-key $fn/$ref maps decode)', () => {
    expect(mapValueToEntryValue({ $fn: 'now()', extra: 1 })).toEqual({
      kind: 'literal',
      value: { $fn: 'now()', extra: 1 },
    })
  })
})

// ── mapToEntries / entriesToMap ─────────────────────────────

describe('mapToEntries', () => {
  it('maps each map entry to an editor entry with a unique id', () => {
    const entries = mapToEntries({
      userId: { $ref: 'userId' },
      when: { $fn: 'now()' },
      count: 3,
    })
    expect(entries).toHaveLength(3)
    expect(entries.map((e) => e.field)).toEqual(['userId', 'when', 'count'])
    expect(entries[0]?.value).toEqual({ kind: 'path', value: 'userId' })
    expect(entries[1]?.value).toEqual({ kind: 'fn', value: 'now()' })
    expect(entries[2]?.value).toEqual({ kind: 'literal', value: 3 })

    const ids = entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns an empty array for an empty map', () => {
    expect(mapToEntries({})).toEqual([])
  })
})

describe('entriesToMap', () => {
  const entry = (field: string, value: QueryValue): CollectionContextEntry => ({
    id: `id-${field}`,
    field,
    value,
  })

  it('serializes entries back to the encoded map', () => {
    const result = entriesToMap([
      entry('userId', { kind: 'path', value: 'session.user' }),
      entry('when', { kind: 'fn', value: 'now()' }),
      entry('count', { kind: 'literal', value: 7 }),
    ])
    expect(result).toEqual({
      userId: { $ref: 'session.user' },
      when: { $fn: 'now()' },
      count: 7,
    })
  })

  it('drops entries whose field name is blank or whitespace-only', () => {
    const result = entriesToMap([
      entry('', { kind: 'literal', value: 'lost' }),
      entry('   ', { kind: 'literal', value: 'also lost' }),
      entry('kept', { kind: 'literal', value: 'ok' }),
    ])
    expect(result).toEqual({ kept: 'ok' })
  })

  it('uses last-write-wins for duplicate field names', () => {
    const result = entriesToMap([
      entry('dup', { kind: 'literal', value: 'first' }),
      entry('dup', { kind: 'literal', value: 'second' }),
    ])
    expect(result).toEqual({ dup: 'second' })
  })

  it('trims surrounding whitespace in field names', () => {
    const result = entriesToMap([entry('  spaced  ', { kind: 'literal', value: 1 })])
    expect(result).toEqual({ spaced: 1 })
  })
})

// ── collectionContextFieldNames ─────────────────────────────

describe('collectionContextFieldNames', () => {
  it('returns trimmed field names from a map', () => {
    expect(collectionContextFieldNames({ foo: 1, '  bar  ': 2 })).toEqual(['foo', 'bar'])
  })

  it('filters out blank keys', () => {
    expect(collectionContextFieldNames({ foo: 1, '   ': 2 })).toEqual(['foo'])
  })

  it('returns an empty array for an empty map', () => {
    expect(collectionContextFieldNames({})).toEqual([])
  })
})
