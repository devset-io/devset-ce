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
// Pipeline monitoring utilities — SHARED
//
// Pure helper functions used by both:
//   - Playground selectors (pages/Playground/hooks/Playground.selectors.ts)
//   - Pipeline monitoring hook (shared/usePipelineMonitoring.ts)
//   - Workflow runs feature (via the shared monitoring hook)
//
// These are stateless, side-effect-free functions for formatting,
// searching, and escaping JSON data.
// ──────────────────────────────────────────────────────────────

/** Pretty-print a value as indented JSON. */
export const formatJson = (value: unknown): string => JSON.stringify(value, null, 2)

/** Create a compact one-line JSON preview, truncated to 120 characters. */
export const compactPreview = (value: unknown): string => {
  const raw = JSON.stringify(value)
  if (!raw) {
    return '{}'
  }
  if (raw.length <= 120) {
    return raw
  }
  return `${raw.slice(0, 117)}...`
}

/** Escape special regex characters so a user's search string is treated as literal text. */
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Recursively collect all string representations of values from a nested object.
 * Used for full-text search across event payloads and headers.
 *
 * Example: { a: 1, b: { c: "hello" } } → ["1", "hello"]
 */
export const collectSearchableValues = (input: unknown): string[] => {
  if (input === null) {
    return ['null']
  }
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return [String(input)]
  }
  if (Array.isArray(input)) {
    return input.flatMap((item) => collectSearchableValues(item))
  }
  if (input && typeof input === 'object') {
    return Object.values(input as Record<string, unknown>).flatMap((value) => collectSearchableValues(value)) // SAFETY: input confirmed as non-null non-array object by preceding typeof/Array.isArray checks
  }
  return []
}
