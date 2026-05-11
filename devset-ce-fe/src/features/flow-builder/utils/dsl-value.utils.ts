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
// DSL value parsing
//
// Parses raw user input into a DSL-compatible value.
// If the input is valid JSON, it's parsed; otherwise it's
// kept as a raw string. Used for "when" condition values
// and state mapping defaults.
// ──────────────────────────────────────────────────────────────

import { safeJsonParse } from '../../../shared/utils/safeJsonParse'

export const parseRawDslValue = (raw: string | undefined): unknown => {
  if (raw === undefined) {
    return ''
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  return safeJsonParse(trimmed, raw)
}
