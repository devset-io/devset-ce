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
import { flattenSchemaFields, valueToText, parseValueText, valueToRaw, parseLiteralText } from './db-query.utils'
import type { MongoFieldSchema } from '../../../../../../shared/services/mongodb-schema.service'

// ── flattenSchemaFields ─────────────────────────────────────

describe('flattenSchemaFields', () => {
  it('returns empty array for empty input', () => {
    expect(flattenSchemaFields([])).toEqual([])
  })

  it('returns leaf paths for flat fields', () => {
    const fields: MongoFieldSchema[] = [
      { path: 'name', type: 'string', children: [] },
      { path: 'age', type: 'number', children: [] },
    ]
    expect(flattenSchemaFields(fields)).toEqual(['name', 'age'])
  })

  it('flattens nested fields to leaf paths only', () => {
    const fields: MongoFieldSchema[] = [
      {
        path: 'address',
        type: 'object',
        children: [
          { path: 'address.street', type: 'string', children: [] },
          { path: 'address.city', type: 'string', children: [] },
        ],
      },
      { path: 'email', type: 'string', children: [] },
    ]
    expect(flattenSchemaFields(fields)).toEqual(['address.street', 'address.city', 'email'])
  })

  it('handles deeply nested structures', () => {
    const fields: MongoFieldSchema[] = [
      {
        path: 'a',
        type: 'object',
        children: [
          {
            path: 'a.b',
            type: 'object',
            children: [
              { path: 'a.b.c', type: 'string', children: [] },
            ],
          },
        ],
      },
    ]
    expect(flattenSchemaFields(fields)).toEqual(['a.b.c'])
  })
})

// ── valueToText ─────────────────────────────────────────────

describe('valueToText', () => {
  it('returns empty string for undefined', () => {
    expect(valueToText(undefined)).toBe('')
  })

  it('formats path values with ${} wrapper', () => {
    expect(valueToText({ kind: 'path', value: 'state.name' })).toBe('${state.name}')
  })

  it('formats fn values with = prefix', () => {
    expect(valueToText({ kind: 'fn', value: 'eq(1,1)' })).toBe('=eq(1,1)')
  })

  it('formats null literal as "null"', () => {
    expect(valueToText({ kind: 'literal', value: null })).toBe('null')
  })

  it('formats undefined literal value as empty string', () => {
    expect(valueToText({ kind: 'literal', value: undefined })).toBe('')
  })

  it('formats string literal as-is', () => {
    expect(valueToText({ kind: 'literal', value: 'hello' })).toBe('hello')
  })

  it('formats number literal as string', () => {
    expect(valueToText({ kind: 'literal', value: 42 })).toBe('42')
  })

  it('formats boolean literal as string', () => {
    expect(valueToText({ kind: 'literal', value: true })).toBe('true')
  })
})

// ── parseValueText ──────────────────────────────────────────

describe('parseValueText', () => {
  it('parses ${var} as path', () => {
    expect(parseValueText('${state.name}')).toEqual({ kind: 'path', value: 'state.name' })
  })

  it('parses =fn() as fn', () => {
    expect(parseValueText('=eq(1,1)')).toEqual({ kind: 'fn', value: 'eq(1,1)' })
  })

  it('parses "null" as null literal', () => {
    expect(parseValueText('null')).toEqual({ kind: 'literal', value: null })
  })

  it('parses "true" as boolean literal', () => {
    expect(parseValueText('true')).toEqual({ kind: 'literal', value: true })
  })

  it('parses "false" as boolean literal', () => {
    expect(parseValueText('false')).toEqual({ kind: 'literal', value: false })
  })

  it('parses integer as number literal', () => {
    expect(parseValueText('42')).toEqual({ kind: 'literal', value: 42 })
  })

  it('parses negative decimal as number literal', () => {
    expect(parseValueText('-3.14')).toEqual({ kind: 'literal', value: -3.14 })
  })

  it('parses plain text as string literal', () => {
    expect(parseValueText('hello world')).toEqual({ kind: 'literal', value: 'hello world' })
  })

  it('trims whitespace before parsing', () => {
    expect(parseValueText('  true  ')).toEqual({ kind: 'literal', value: true })
  })

  it('handles empty string as string literal', () => {
    expect(parseValueText('')).toEqual({ kind: 'literal', value: '' })
  })
})

// ── valueToRaw ─────────────────────────────────────────────

describe('valueToRaw', () => {
  it('returns empty string for undefined', () => {
    expect(valueToRaw(undefined)).toBe('')
  })

  it('returns raw path value without ${} wrapper', () => {
    expect(valueToRaw({ kind: 'path', value: 'state.name' })).toBe('state.name')
  })

  it('returns raw fn value without = prefix', () => {
    expect(valueToRaw({ kind: 'fn', value: 'eq(1,1)' })).toBe('eq(1,1)')
  })

  it('returns "null" for null literal', () => {
    expect(valueToRaw({ kind: 'literal', value: null })).toBe('null')
  })

  it('returns empty string for undefined literal value', () => {
    expect(valueToRaw({ kind: 'literal', value: undefined })).toBe('')
  })

  it('returns string representation of number', () => {
    expect(valueToRaw({ kind: 'literal', value: 42 })).toBe('42')
  })

  it('returns string literal as-is', () => {
    expect(valueToRaw({ kind: 'literal', value: 'hello' })).toBe('hello')
  })

  it('returns string representation of boolean', () => {
    expect(valueToRaw({ kind: 'literal', value: true })).toBe('true')
  })
})

// ── parseLiteralText ───────────────────────────────────────

describe('parseLiteralText', () => {
  it('parses "null" as null literal', () => {
    expect(parseLiteralText('null')).toEqual({ kind: 'literal', value: null })
  })

  it('parses "true" as boolean literal', () => {
    expect(parseLiteralText('true')).toEqual({ kind: 'literal', value: true })
  })

  it('parses "false" as boolean literal', () => {
    expect(parseLiteralText('false')).toEqual({ kind: 'literal', value: false })
  })

  it('parses integer as number literal', () => {
    expect(parseLiteralText('42')).toEqual({ kind: 'literal', value: 42 })
  })

  it('parses negative decimal as number literal', () => {
    expect(parseLiteralText('-3.14')).toEqual({ kind: 'literal', value: -3.14 })
  })

  it('parses plain text as string literal', () => {
    expect(parseLiteralText('hello')).toEqual({ kind: 'literal', value: 'hello' })
  })

  it('trims whitespace before parsing', () => {
    expect(parseLiteralText('  true  ')).toEqual({ kind: 'literal', value: true })
  })

  it('does NOT interpret ${} as path — always returns literal', () => {
    expect(parseLiteralText('${state.name}')).toEqual({ kind: 'literal', value: '${state.name}' })
  })

  it('does NOT interpret = as fn — always returns literal', () => {
    expect(parseLiteralText('=eq(1,1)')).toEqual({ kind: 'literal', value: '=eq(1,1)' })
  })

  it('handles empty string as string literal', () => {
    expect(parseLiteralText('')).toEqual({ kind: 'literal', value: '' })
  })
})
