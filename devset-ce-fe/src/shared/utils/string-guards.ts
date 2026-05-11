/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** Asserts the value is a non-empty trimmed string, throws otherwise. */
export function requireTrimmed(value: string, errorMessage: string): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(errorMessage)
  }
  return normalized
}