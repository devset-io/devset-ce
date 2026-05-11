/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { MongoFieldSchema } from '../../../../../../shared/services/mongodb-schema.service'
import type { QueryConfig, QueryValue } from '../../../../types'

// Only operators that work with the single-value text input. `$in` (array) and `$regex`
// (object form) require richer input; reintroduce when the editor supports them.
export const FIND_OPS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$exists'] as const

export const EMPTY_QUERY: QueryConfig = {
  connection: '',
  database: '',
  collection: '',
  find: [],
  select: [],
}

export const SELECT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-2 text-xs font-semibold text-[var(--ink-900)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-50'

/** Flattens nested MongoFieldSchema into a flat list of leaf paths. */
export function flattenSchemaFields(fields: MongoFieldSchema[]): string[] {
  const result: string[] = []
  for (const f of fields) {
    if (f.children.length > 0) {
      result.push(...flattenSchemaFields(f.children))
    } else {
      result.push(f.path)
    }
  }
  return result
}

export function valueToText(v: QueryValue | undefined): string {
  if (!v) return ''
  if (v.kind === 'path') return `\${${v.value as string}}`
  if (v.kind === 'fn') return `=${v.value as string}`
  if (v.value === null) return 'null'
  return v.value === undefined ? '' : String(v.value)
}

/** Returns the raw inner text of a QueryValue (no prefix encoding). */
export function valueToRaw(v: QueryValue | undefined): string {
  if (!v) return ''
  if (v.value === null) return 'null'
  return v.value === undefined ? '' : String(v.value)
}

/** Parses raw text into a literal QueryValue, coercing booleans/numbers/null. */
export function parseLiteralText(text: string): QueryValue {
  const t = text.trim()
  if (t === 'null') return { kind: 'literal', value: null }
  if (t === 'true') return { kind: 'literal', value: true }
  if (t === 'false') return { kind: 'literal', value: false }
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: 'literal', value: Number(t) }
  return { kind: 'literal', value: text }
}

export function parseValueText(text: string): QueryValue {
  const t = text.trim()
  const fullVar = t.match(/^\$\{([^}]*)\}$/)
  if (fullVar) return { kind: 'path', value: fullVar[1] }
  if (t.startsWith('=')) return { kind: 'fn', value: t.slice(1) }
  if (t === 'null') return { kind: 'literal', value: null }
  if (t === 'true') return { kind: 'literal', value: true }
  if (t === 'false') return { kind: 'literal', value: false }
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: 'literal', value: Number(t) }
  return { kind: 'literal', value: text }
}
