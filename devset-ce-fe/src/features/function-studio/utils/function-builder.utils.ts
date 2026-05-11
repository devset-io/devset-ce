/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import {
  DEFAULT_WHEN_CONDITION_KIND,
  isWhenConditionFnKind,
  type FnKind,
} from '../../flow-builder/config/function-catalog.ts'
import type {
  FunctionBuilderInitialState,
  LiteralKind,
  ValueMode,
} from '../types/function-builder.types.ts'

export const DEFAULT_FUNCTION_BUILDER_FIELDS = ['value']

const defaultLiteralValueByKind = (kind: LiteralKind) => {
  if (kind === 'number') {
    return '0'
  }
  if (kind === 'boolean') {
    return 'false'
  }
  if (kind === 'null') {
    return 'null'
  }
  if (kind === 'json') {
    return '{}'
  }
  return ''
}

const stringifyJsonFragment = (value: unknown, fallback: string) => {
  const serialized = JSON.stringify(value, null, 2)
  return typeof serialized === 'string' ? serialized : fallback
}

const parseConditionExpression = (expressionToParse: string) => {
  const normalized = expressionToParse.trim()
  const fnMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9]*)\((.*)\)$/)
  if (!fnMatch) {
    return null
  }

  const parsedKind = fnMatch[1]
  if (!isWhenConditionFnKind(parsedKind)) {
    return null
  }

  const [argA, argB] = fnMatch[2].split(',').map((item) => item.trim())
  return {
    kind: parsedKind as FnKind, // SAFETY: parsedKind validated against function catalog by isWhenConditionFnKind guard above
    leftArg: argA || '.value',
    rightArg: argB || '0',
  }
}

export const buildInitialFunctionBuilderState = ({
  fields,
  selectedField,
  selectedFieldLiteralKindHint,
  selectedFieldExpression,
  selectedFieldMode,
  selectedFieldValue,
  selectedFieldRawValue,
}: {
  fields: string[]
  selectedField?: string
  selectedFieldLiteralKindHint: LiteralKind
  selectedFieldExpression?: string | null
  selectedFieldMode?: ValueMode
  selectedFieldValue?: string | null
  selectedFieldRawValue?: unknown
}): FunctionBuilderInitialState => {
  const initial: FunctionBuilderInitialState = {
    targetField: selectedField ?? fields[0] ?? '',
    valueMode: 'literal',
    fnExpression: '',
    conditionKind: DEFAULT_WHEN_CONDITION_KIND,
    conditionLeftArg: '.value',
    conditionRightArg: '0',
    whenValueRaw: '1',
    whenHasDefault: true,
    whenDefaultRaw: '0',
    literalValue: '0',
    literalKind: 'string',
    refValue: 'value',
    pathValue: 'state.entity.userId',
  }

  if (!selectedField) {
    return initial
  }

  if (selectedFieldMode === 'when') {
    initial.valueMode = 'when'
    if (
      selectedFieldRawValue &&
      typeof selectedFieldRawValue === 'object' &&
      'when' in (selectedFieldRawValue as Record<string, unknown>) && // SAFETY: value confirmed as non-null object by typeof check above
      'value' in (selectedFieldRawValue as Record<string, unknown>) // SAFETY: value confirmed as non-null object by typeof check above
    ) {
      const conditional = selectedFieldRawValue as { // SAFETY: 'when' and 'value' keys confirmed present by 'in' checks above
        when?: { $fn?: unknown }
        value?: unknown
        default?: unknown
      }
      if (typeof conditional.when?.$fn === 'string') {
        const parsed = parseConditionExpression(conditional.when.$fn)
        if (parsed) {
          initial.conditionKind = parsed.kind
          initial.conditionLeftArg = parsed.leftArg
          initial.conditionRightArg = parsed.rightArg
        }
      }
      if (conditional.value !== undefined) {
        initial.whenValueRaw = stringifyJsonFragment(conditional.value, initial.whenValueRaw)
      }
      if (Object.prototype.hasOwnProperty.call(conditional, 'default')) {
        initial.whenHasDefault = true
        initial.whenDefaultRaw = stringifyJsonFragment(conditional.default, initial.whenDefaultRaw)
      } else {
        initial.whenHasDefault = false
        initial.whenDefaultRaw = '0'
      }
    }
    return initial
  }

  if (selectedFieldMode === 'literal') {
    initial.valueMode = 'literal'
    if (selectedFieldRawValue === null) {
      initial.literalKind = 'null'
      initial.literalValue = 'null'
      return initial
    }
    if (typeof selectedFieldRawValue === 'boolean') {
      initial.literalKind = 'boolean'
      initial.literalValue = String(selectedFieldRawValue)
      return initial
    }
    if (typeof selectedFieldRawValue === 'number') {
      initial.literalKind = 'number'
      initial.literalValue = String(selectedFieldRawValue)
      return initial
    }
    if (typeof selectedFieldRawValue === 'string') {
      initial.literalKind = 'string'
      initial.literalValue = selectedFieldRawValue
      return initial
    }
    if (selectedFieldRawValue && typeof selectedFieldRawValue === 'object') {
      initial.literalKind = 'json'
      initial.literalValue = stringifyJsonFragment(selectedFieldRawValue, '{}')
      return initial
    }
    initial.literalKind = selectedFieldLiteralKindHint
    initial.literalValue =
      selectedFieldValue !== null && selectedFieldValue !== undefined
        ? selectedFieldValue
        : defaultLiteralValueByKind(selectedFieldLiteralKindHint)
    return initial
  }

  if (selectedFieldMode === 'ref') {
    initial.valueMode = 'ref'
    if (selectedFieldValue !== null && selectedFieldValue !== undefined) {
      initial.refValue = selectedFieldValue
    }
    return initial
  }

  if (selectedFieldMode === 'path') {
    initial.valueMode = 'path'
    if (selectedFieldValue !== null && selectedFieldValue !== undefined) {
      initial.pathValue = selectedFieldValue
    }
    return initial
  }

  if (selectedFieldExpression?.trim()) {
    initial.valueMode = 'fn'
    initial.fnExpression = selectedFieldExpression
    return initial
  }

  initial.valueMode = 'literal'
  initial.literalKind = selectedFieldLiteralKindHint
  initial.literalValue = defaultLiteralValueByKind(selectedFieldLiteralKindHint)
  return initial
}
