/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** Trims the string, returning the fallback if the result is empty. */
export function trimOr<T>(value: string | null | undefined, fallback: T): string | T {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || fallback
}

/** Trims the string, returning null if the result is empty. */
export function trimToNull(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}