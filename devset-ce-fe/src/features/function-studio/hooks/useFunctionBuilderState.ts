/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo, useState } from 'react'
import { DEFAULT_FUNCTION_FALLBACK } from '../../flow-builder/config/function-catalog.ts'
import { normalizeFunctionCallExpression } from '../../flow-builder/function-call.utils.ts'
import type { FunctionBuilderProps } from '../types/function-builder.types.ts'
import {
  buildInitialFunctionBuilderState,
  DEFAULT_FUNCTION_BUILDER_FIELDS,
} from '../utils/function-builder.utils.ts'

/** Manages local state for the function builder form. */
export function useFunctionBuilderState({
  availableFields,
  onApply,
  selectedField,
  selectedFieldLiteralKindHint = 'string',
  selectedFieldExpression,
  selectedFieldMode,
  selectedFieldValue,
  selectedFieldRawValue,
}: FunctionBuilderProps) {
  const fields = availableFields.length > 0 ? availableFields : DEFAULT_FUNCTION_BUILDER_FIELDS
  const initialState = buildInitialFunctionBuilderState({
    fields,
    selectedField,
    selectedFieldLiteralKindHint,
    selectedFieldExpression,
    selectedFieldMode,
    selectedFieldValue,
    selectedFieldRawValue,
  })

  const [targetField, setTargetField] = useState(initialState.targetField)
  const [valueMode, setValueMode] = useState(initialState.valueMode)
  const [fnExpression, setFnExpression] = useState(initialState.fnExpression)
  const [conditionKind, setConditionKind] = useState(initialState.conditionKind)
  const [conditionLeftArg, setConditionLeftArg] = useState(initialState.conditionLeftArg)
  const [conditionRightArg, setConditionRightArg] = useState(initialState.conditionRightArg)
  const [whenValueRaw, setWhenValueRaw] = useState(initialState.whenValueRaw)
  const [whenHasDefault, setWhenHasDefault] = useState(initialState.whenHasDefault)
  const [whenDefaultRaw, setWhenDefaultRaw] = useState(initialState.whenDefaultRaw)
  const [literalValue, setLiteralValue] = useState(initialState.literalValue)
  const [literalKind, setLiteralKind] = useState(initialState.literalKind)
  const [refValue, setRefValue] = useState(initialState.refValue)
  const [pathValue, setPathValue] = useState(initialState.pathValue)

  const effectiveTargetField = targetField.trim() || fields[0] || ''
  const whenConditionExpression = useMemo(
    () => `${conditionKind}(${conditionLeftArg},${conditionRightArg})`,
    [conditionKind, conditionLeftArg, conditionRightArg],
  )
  const isApplyDisabled =
    !effectiveTargetField.trim() ||
    (valueMode === 'ref' && !refValue.trim()) ||
    (valueMode === 'path' && !pathValue.trim())

  const resolveValue = () => {
    switch (valueMode) {
      case 'fn':
        return normalizeFunctionCallExpression(fnExpression) || `${DEFAULT_FUNCTION_FALLBACK}()`
      case 'ref':
        return refValue.trim()
      case 'path':
        return pathValue.trim()
      case 'when':
        return whenValueRaw
      default:
        return literalValue
    }
  }

  const handleApply = () => {
    onApply(effectiveTargetField, {
      mode: valueMode,
      value: resolveValue(),
      literalKind: valueMode === 'literal' ? literalKind : undefined,
      whenCondition: valueMode === 'when' ? whenConditionExpression : undefined,
      whenValueRaw: valueMode === 'when' ? whenValueRaw : undefined,
      whenHasDefault: valueMode === 'when' ? whenHasDefault : undefined,
      whenDefaultRaw: valueMode === 'when' ? whenDefaultRaw : undefined,
    })
  }

  return {
    fields,
    effectiveTargetField,
    valueMode,
    fnExpression,
    conditionKind,
    conditionLeftArg,
    conditionRightArg,
    whenValueRaw,
    whenHasDefault,
    whenDefaultRaw,
    literalValue,
    literalKind,
    refValue,
    pathValue,
    whenConditionExpression,
    isApplyDisabled,
    setTargetField,
    setValueMode,
    setFnExpression,
    setConditionKind,
    setConditionLeftArg,
    setConditionRightArg,
    setWhenValueRaw,
    setWhenHasDefault,
    setWhenDefaultRaw,
    setLiteralValue,
    setLiteralKind,
    setRefValue,
    setPathValue,
    handleApply,
  }
}
