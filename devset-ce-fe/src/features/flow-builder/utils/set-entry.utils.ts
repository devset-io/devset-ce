/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// Set-entry parsing
//
// Walks a DSL "set" block (the key-value object that defines
// what data a pipeline step produces) and flattens it into a
// list of SetEntry objects. Each entry describes one field with
// its kind ($fn, $ref, $path, when, or literal), a preview
// string for the UI, and whether it's required/missing.
// ──────────────────────────────────────────────────────────────

import type { SetEntry } from '../types'

export const toSetEntries = (setBlock: Record<string, unknown>, requiredRootFields?: Set<string>): SetEntry[] => {
  const entries: SetEntry[] = []
  const isRequiredPath = (path: string) => {
    const root = path.split(/[.[\]]/)[0]
    return Boolean(root) && Boolean(requiredRootFields?.has(root))
  }
  const isFilledValue = (value: unknown): boolean => {
    if (value === undefined || value === null) {
      return false
    }
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return true
  }

  const walk = (value: unknown, path: string) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const conditionalValue = value as { when?: unknown; value?: unknown; default?: unknown } // SAFETY: accessing optional properties on confirmed object value
      if (
        'when' in conditionalValue &&
        conditionalValue.when &&
        typeof conditionalValue.when === 'object' &&
        '$fn' in (conditionalValue.when as Record<string, unknown>) && // SAFETY: when field confirmed as object by preceding typeof check
        typeof (conditionalValue.when as { $fn?: unknown }).$fn === 'string' && // SAFETY: accessing optional $fn after 'in' check on line 55
        'value' in conditionalValue
      ) {
        entries.push({
          field: path,
          kind: 'when',
          preview: `when(${String((conditionalValue.when as { $fn: string }).$fn)})`, // SAFETY: $fn confirmed as string by typeof check above,
          rawValue: value,
          isRequired: isRequiredPath(path),
          isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
        })
        return
      }
      if ('$fn' in value && typeof (value as { $fn?: unknown }).$fn === 'string') { // SAFETY: $fn confirmed as string by typeof check above
        entries.push({
          field: path,
          kind: 'fn',
          preview: String((value as { $fn: string }).$fn), // SAFETY: $fn confirmed as string by typeof check above
          rawValue: value,
          isRequired: isRequiredPath(path),
          isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
        })
        return
      }
      if ('$ref' in value && typeof (value as { $ref?: unknown }).$ref === 'string') { // SAFETY: $ref confirmed as string by typeof check above
        entries.push({
          field: path,
          kind: 'ref',
          preview: String((value as { $ref: string }).$ref), // SAFETY: $ref confirmed as string by typeof check above
          rawValue: value,
          isRequired: isRequiredPath(path),
          isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
        })
        return
      }
      if ('$path' in value && typeof (value as { $path?: unknown }).$path === 'string') { // SAFETY: $path confirmed as string by typeof check above
        entries.push({
          field: path,
          kind: 'path',
          preview: String((value as { $path: string }).$path), // SAFETY: $path confirmed as string by typeof check above
          rawValue: value,
          isRequired: isRequiredPath(path),
          isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
        })
        return
      }
      entries.push({
        field: path,
        kind: 'literal',
        preview: Object.keys(value).length === 0 ? '{}' : '{...}',
        rawValue: value,
        isContainer: true,
        isRequired: isRequiredPath(path),
        isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
      })
      Object.entries(value).forEach(([key, nested]) => {
        walk(nested, path ? `${path}.${key}` : key)
      })
      return
    }

    if (Array.isArray(value)) {
      entries.push({
        field: path,
        kind: 'literal',
        preview: value.length === 0 ? '[]' : `[${value.length}]`,
        rawValue: value,
        isContainer: true,
        isRequired: isRequiredPath(path),
        isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
      })
      if (value.length === 0) {
        return
      }
      value.forEach((item, index) => {
        walk(item, `${path}[${index}]`)
      })
      return
    }

    entries.push({
      field: path,
      kind: 'literal',
      preview:
        typeof value === 'string'
          ? value === ''
            ? '""'
            : value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value),
      rawValue: value,
      isRequired: isRequiredPath(path),
      isMissingRequired: isRequiredPath(path) && !isFilledValue(value),
    })
  }

  Object.entries(setBlock).forEach(([key, value]) => walk(value, key))
  return entries
}
