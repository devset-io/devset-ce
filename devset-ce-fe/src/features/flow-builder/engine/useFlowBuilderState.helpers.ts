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
// Re-export barrel
//
// This file used to contain 825 lines of mixed-domain helpers.
// The logic has been split into 3 domain-specific modules:
//
//   utils/schema-extraction.utils.ts  – schema parsing + field extraction
//   utils/set-entry.utils.ts          – DSL set-block entry flattening
//   utils/dsl-value.utils.ts          – raw DSL value parsing
//
// This barrel re-exports everything so existing import paths
// continue to work. New code should import from the specific
// module directly.
// ──────────────────────────────────────────────────────────────

export * from '../utils/schema-extraction.utils'
export * from '../utils/set-entry.utils'
export * from '../utils/dsl-value.utils'
