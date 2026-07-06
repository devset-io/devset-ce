/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { QueryValue } from '../../../../../flow-builder'
import type { CollectionContextEntry } from '../../state/MessageDispatch.types'
import { generateUuid } from '../../../../../../shared/utils/random'

/**
 * Converts a single context value into the JSON form persisted inside
 * collectionContext. The persisted form matches the workflow DSL the BE
 * pipeline compiler consumes when seeding `state.*` — paths become
 * `{"$ref":"..."}`, functions `{"$fn":"..."}`, literals are sent as their
 * native JSON type (string/number/bool/null). The editor's mode radio
 * already disambiguates intent, so no string-prefix markers are needed.
 */
export function entryValueToMapValue(value: QueryValue): unknown {
  if (value.kind === 'path') {
    return { $ref: String(value.value ?? '') }
  }
  if (value.kind === 'fn') {
    return { $fn: String(value.value ?? '') }
  }
  return value.value ?? null
}

/**
 * Parses a single value from collectionContext map back into the editor's
 * tri-modal QueryValue shape. Single-key maps with `$fn` or `$ref` are
 * decoded as fn/path; everything else (including raw strings) is treated
 * as a literal.
 */
export function mapValueToEntryValue(raw: unknown): QueryValue {
  if (isPlainObject(raw)) {
    const keys = Object.keys(raw)
    if (keys.length === 1) {
      if (keys[0] === '$fn') {
        return { kind: 'fn', value: stringifyDslArg(raw.$fn) }
      }
      if (keys[0] === '$ref') {
        return { kind: 'path', value: stringifyDslArg(raw.$ref) }
      }
    }
  }
  return { kind: 'literal', value: raw as unknown }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringifyDslArg(raw: unknown): string {
  return raw == null ? '' : String(raw)
}

export function mapToEntries(map: Record<string, unknown>): CollectionContextEntry[] {
  return Object.entries(map).map(([field, raw]) => ({
    id: generateUuid(),
    field,
    value: mapValueToEntryValue(raw),
  }))
}

/**
 * Returns bare field names from a collection's persisted `collectionContext`.
 * Fed into the DSL completer so the Raw JSON editor can suggest them inside
 * `"$ref": "..."` (relative) and `"$path": "state...."` (absolute) value
 * positions — the completer prefixes with `state.` for `$path` itself.
 */
export function collectionContextFieldNames(
  collectionContext: Record<string, unknown>,
): string[] {
  return Object.keys(collectionContext)
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
}

/**
 * Serializes editor entries to the map persisted on the backend.
 * Entries with a blank field name are dropped. Duplicate fields use
 * last-write-wins ordering.
 */
export function entriesToMap(entries: CollectionContextEntry[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const entry of entries) {
    const field = entry.field.trim()
    if (!field) continue
    result[field] = entryValueToMapValue(entry.value)
  }
  return result
}

