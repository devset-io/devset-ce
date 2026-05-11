/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FieldOverridePayload } from '../../flow-builder/types.ts'
import type { FnKind } from '../../flow-builder/config/function-catalog.ts'

export type LiteralKind = 'string' | 'number' | 'boolean' | 'null' | 'json'
export type ValueMode = 'fn' | 'literal' | 'ref' | 'path' | 'when'

export type FunctionBuilderProps = {
  availableFields: string[]
  onApply: (field: string, payload: FieldOverridePayload) => void
  disabled?: boolean
  selectedField?: string
  selectedFieldLiteralKindHint?: LiteralKind
  selectedFieldExpression?: string | null
  selectedFieldMode?: ValueMode
  selectedFieldValue?: string | null
  selectedFieldRawValue?: unknown
}

export type FunctionBuilderInitialState = {
  targetField: string
  valueMode: ValueMode
  fnExpression: string
  conditionKind: FnKind
  conditionLeftArg: string
  conditionRightArg: string
  whenValueRaw: string
  whenHasDefault: boolean
  whenDefaultRaw: string
  literalValue: string
  literalKind: LiteralKind
  refValue: string
  pathValue: string
}
