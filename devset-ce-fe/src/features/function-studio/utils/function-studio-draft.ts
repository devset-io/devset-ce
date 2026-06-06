/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { BuilderNode, FieldOverridePayload, StageWireFormatPrefixSource } from '../../flow-builder/types.ts'
import { normalizeFunctionCallExpression } from '../../flow-builder/function-call.utils.ts'
import { safeJsonParse } from '../../../shared/utils/safeJsonParse.ts'

export type SourceMode = 'none' | 'previous-stage'
export type StateTaskMode = 'assign' | 'fn' | 'when'

export type PendingOperation =
  | { type: 'schema'; event: string }
  | { type: 'source'; source: SourceMode }
  | { type: 'function'; field: string; payload: FieldOverridePayload }
  | { type: 'wire-format-set'; source: StageWireFormatPrefixSource; value?: number }
  | { type: 'wire-format-clear' }
  | {
      type: 'state-add'
      sourceField: string
      targetStatePath: string
      mode: 'ref' | 'fn' | 'when'
      functionExpression?: string
      whenValueRaw?: string
      whenHasDefault?: boolean
      whenDefaultRaw?: string
    }
  | { type: 'state-remove'; statePath: string }
  | { type: 'dsl-raw'; setRaw: string; stateRaw: string }

export type StateTaskForm = {
  targetStatePath: string
  sourceField: string
  mode: StateTaskMode
  fnExpression: string
  whenCondition: string
  whenValueRaw: string
  whenHasDefault: boolean
  whenDefaultRaw: string
  isFnDirty: boolean
}

export const DEFAULT_WHEN_CONDITION = 'eq(1,1)'
export const DEFAULT_WHEN_VALUE = '1'
export const DEFAULT_WHEN_DEFAULT = '0'

const baseStateTaskForm = (): StateTaskForm => ({
  targetStatePath: 'entity.value',
  sourceField: '',
  mode: 'assign',
  fnExpression: '',
  whenCondition: DEFAULT_WHEN_CONDITION,
  whenValueRaw: DEFAULT_WHEN_VALUE,
  whenHasDefault: false,
  whenDefaultRaw: DEFAULT_WHEN_DEFAULT,
  isFnDirty: false,
})

export const resetStateTaskForm = (): StateTaskForm => baseStateTaskForm()

export const safeParseJson = (raw: string): unknown => safeJsonParse(raw, raw)

export const extractRootField = (fieldPath: string): string => fieldPath.split(/[.[\]]/)[0] ?? ''

export const buildDraftSelectedStageState = (
  selectedStageState: Record<string, unknown>,
  pendingOps: PendingOperation[],
): Record<string, unknown> => {
  // dsl-raw is authoritative when present (reducer enforces mutual exclusion
  // with state-add / state-remove ops). Parsing it here keeps the
  // function-task UI in sync with what the raw-DSL editor showed.
  const dslRawOp = pendingOps.find((op) => op.type === 'dsl-raw')
  if (dslRawOp && dslRawOp.type === 'dsl-raw') {
    try {
      return JSON.parse(dslRawOp.stateRaw) as Record<string, unknown>
    } catch {
      return { ...selectedStageState }
    }
  }
  const draft = { ...selectedStageState }
  pendingOps.forEach((operation) => {
    if (operation.type === 'state-add') {
      draft[operation.targetStatePath] =
        operation.mode === 'fn'
          ? { $fn: normalizeFunctionCallExpression(operation.functionExpression ?? '') || 'now()' }
          : operation.mode === 'when'
            ? {
                when: { $fn: operation.functionExpression?.trim() || DEFAULT_WHEN_CONDITION },
                value: operation.whenValueRaw?.trim() ? safeParseJson(operation.whenValueRaw) : '',
                ...(operation.whenHasDefault
                  ? {
                      default: operation.whenDefaultRaw?.trim()
                        ? safeParseJson(operation.whenDefaultRaw)
                        : null,
                    }
                  : {}),
              }
            : { $ref: operation.sourceField }
    }
    if (operation.type === 'state-remove') {
      delete draft[operation.statePath]
    }
  })
  return draft
}

export const toStateFormFromMapping = (statePath: string, mapping: unknown): StateTaskForm => {
  const next = resetStateTaskForm()
  next.targetStatePath = statePath

  if (
    mapping &&
    typeof mapping === 'object' &&
    'when' in (mapping as Record<string, unknown>) && // SAFETY: mapping confirmed as non-null object by typeof check above
    'value' in (mapping as Record<string, unknown>) // SAFETY: mapping confirmed as non-null object by typeof check above
  ) {
    const conditional = mapping as { // SAFETY: 'when' and 'value' keys confirmed present by 'in' checks above
      when?: { $fn?: unknown }
      value?: unknown
      default?: unknown
    }
    next.mode = 'when'
    next.sourceField = ''
    next.whenCondition =
      conditional.when && typeof conditional.when.$fn === 'string'
        ? conditional.when.$fn
        : DEFAULT_WHEN_CONDITION
    next.whenValueRaw = JSON.stringify(conditional.value ?? '', null, 2)
    if (Object.prototype.hasOwnProperty.call(conditional, 'default')) {
      next.whenHasDefault = true
      next.whenDefaultRaw = JSON.stringify(conditional.default, null, 2)
    }
    return next
  }

  if (mapping && typeof mapping === 'object' && '$fn' in (mapping as Record<string, unknown>)) { // SAFETY: mapping confirmed as non-null object by preceding typeof/truthy check
    next.mode = 'fn'
    next.sourceField = ''
    next.fnExpression = String((mapping as { $fn: unknown }).$fn) // SAFETY: $fn key confirmed present by 'in' check above
    next.isFnDirty = true
    return next
  }

  if (mapping && typeof mapping === 'object' && '$ref' in (mapping as Record<string, unknown>)) { // SAFETY: mapping confirmed as non-null object by preceding typeof/truthy check
    next.mode = 'assign'
    next.sourceField = String((mapping as { $ref: unknown }).$ref) // SAFETY: $ref key confirmed present by 'in' check above
    return next
  }

  return next
}

export const applyPendingOperations = async (
  pendingOps: PendingOperation[],
  handlers: {
    onSchemaChange: (event: string) => void
    onSourceChange: (source: SourceMode) => void
    onApplyFunction: (field: string, payload: FieldOverridePayload) => void
    onAddStateMapping: (
      sourceField: string,
      targetStatePath: string,
      mode: 'ref' | 'fn' | 'when',
      functionExpression?: string,
      whenValueRaw?: string,
      whenHasDefault?: boolean,
      whenDefaultRaw?: string,
    ) => void
    onRemoveStateMapping: (statePath: string) => void
    onSetStageWireFormat: (source: StageWireFormatPrefixSource, value?: number) => void
    onClearStageWireFormat: () => void
    onApplyDslRaw: (setRaw: string, stateRaw: string) => void
  },
): Promise<void> => {
  // dsl-raw is mutually exclusive with function / state-add / state-remove ops:
  // the reducer drops one whenever the other is dispatched (see
  // FunctionStudio.reducer.ts). So at apply time at most one branch runs for
  // set/state. We still run dsl-raw last as a belt-and-braces guard against
  // any future reducer change that lets them coexist.
  const dslRawOp = pendingOps.find((op) => op.type === 'dsl-raw')
  pendingOps.forEach((operation) => {
    if (operation.type === 'dsl-raw') return
    if (operation.type === 'schema') {
      handlers.onSchemaChange(operation.event)
      return
    }
    if (operation.type === 'source') {
      handlers.onSourceChange(operation.source)
      return
    }
    if (operation.type === 'function') {
      handlers.onApplyFunction(operation.field, operation.payload)
      return
    }
    if (operation.type === 'wire-format-set') {
      handlers.onSetStageWireFormat(operation.source, operation.value)
      return
    }
    if (operation.type === 'wire-format-clear') {
      handlers.onClearStageWireFormat()
      return
    }
    if (operation.type === 'state-add') {
      handlers.onAddStateMapping(
        operation.sourceField,
        operation.targetStatePath,
        operation.mode,
        operation.functionExpression,
        operation.whenValueRaw,
        operation.whenHasDefault,
        operation.whenDefaultRaw,
      )
      return
    }
    handlers.onRemoveStateMapping(operation.statePath)
  })
  if (dslRawOp && dslRawOp.type === 'dsl-raw') {
    handlers.onApplyDslRaw(dslRawOp.setRaw, dslRawOp.stateRaw)
  }
}

export const getNodeLabel = (
  selectedNode: BuilderNode | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string =>
  selectedNode
    ? t('flow.nodeLabel.format', { stage: selectedNode.data.stage, event: selectedNode.data.event })
    : t('flow.nodeLabel.none')
