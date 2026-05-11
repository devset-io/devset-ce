/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** Kind of a DSL value: literal string, $ref path, or $fn expression. */
export type KeyValueKind = 'literal' | 'ref' | 'fn'

/** A DSL value with its kind. */
export type KeyValue = { kind: KeyValueKind; value: string }

export const EMPTY_KEY: KeyValue = { kind: 'literal', value: '' }

/** Serializes a KeyValue to its DSL representation. */
export function serializeKeyValue(kv: KeyValue | undefined): string | Record<string, string> | null {
  if (!kv || !kv.value.trim()) return null
  const v = kv.value.trim()
  switch (kv.kind) {
    case 'ref': return { $ref: v }
    case 'fn': return { $fn: v }
    default: return v
  }
}

/** Parses a DSL key (string | {$ref} | {$fn} | null) into a KeyValue. */
export function parseKeyValue(raw: string | Record<string, unknown> | null | undefined): KeyValue {
  if (raw == null) return { kind: 'literal', value: '' }
  if (typeof raw === 'string') return { kind: 'literal', value: raw }
  if ('$ref' in raw) return { kind: 'ref', value: String(raw['$ref'] ?? '') }
  if ('$fn' in raw) return { kind: 'fn', value: String(raw['$fn'] ?? '') }
  return { kind: 'literal', value: JSON.stringify(raw) }
}

/** Formats a KeyValue for display. */
export function formatKeyValueDisplay(kv: KeyValue): string {
  if (!kv.value.trim()) return ''
  switch (kv.kind) {
    case 'ref': return `$ref(${kv.value})`
    case 'fn': return `$fn(${kv.value})`
    default: return kv.value
  }
}
