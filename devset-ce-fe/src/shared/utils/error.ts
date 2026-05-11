/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** Extracts error message or returns fallback for unknown errors. */
export function normalizeError(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error ? error.message : fallback
}
