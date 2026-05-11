/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

export type FnEditorMode = 'binary' | 'bare' | 'range' | 'choice' | 'choiceWeighted'

type FunctionCatalogEntry = {
  name: string
  label: string
  hint: string
  example: string
  editorMode: FnEditorMode
  supportsWhenCondition?: boolean
}

export const FUNCTION_CATALOG = [
  { name: 'choiceWeighted', label: 'fn.choiceWeighted.label', hint: 'fn.choiceWeighted.hint', example: 'choiceWeighted(10:50,20:30,30:20)', editorMode: 'choiceWeighted' },
  { name: 'choice', label: 'fn.choice.label', hint: 'fn.choice.hint', example: 'choice(A,B,C)', editorMode: 'choice' },
  { name: 'int', label: 'fn.int.label', hint: 'fn.int.hint', example: 'int(1,200)', editorMode: 'range' },
  { name: 'long', label: 'fn.long.label', hint: 'fn.long.hint', example: 'long(1,200)', editorMode: 'range' },
  { name: 'add', label: 'fn.add.label', hint: 'fn.add.hint', example: 'add(state.entity.totalMileage,.value)', editorMode: 'binary' },
  { name: 'sub', label: 'fn.sub.label', hint: 'fn.sub.hint', example: 'sub(.value,.verifiedMileage)', editorMode: 'binary' },
  { name: 'percent', label: 'fn.percent.label', hint: 'fn.percent.hint', example: 'percent(state.entity.totalVerifiedMileage,state.entity.totalMileage)', editorMode: 'binary' },
  { name: 'lt', label: 'fn.lt.label', hint: 'fn.lt.hint', example: 'lt(.value,100)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'lte', label: 'fn.lte.label', hint: 'fn.lte.hint', example: 'lte(.value,100)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'gt', label: 'fn.gt.label', hint: 'fn.gt.hint', example: 'gt(.value,0)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'gte', label: 'fn.gte.label', hint: 'fn.gte.hint', example: 'gte(.value,0)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'eq', label: 'fn.eq.label', hint: 'fn.eq.hint', example: 'eq(.status,READY)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'neq', label: 'fn.neq.label', hint: 'fn.neq.hint', example: 'neq(.value,0)', editorMode: 'binary', supportsWhenCondition: true },
  { name: 'now', label: 'fn.now.label', hint: 'fn.now.hint', example: 'now()', editorMode: 'bare' },
  { name: 'nows', label: 'fn.nows.label', hint: 'fn.nows.hint', example: 'nows()', editorMode: 'bare' },
  { name: 'nowms', label: 'fn.nowms.label', hint: 'fn.nowms.hint', example: 'nowms()', editorMode: 'bare' },
  { name: 'uuid', label: 'fn.uuid.label', hint: 'fn.uuid.hint', example: 'uuid()', editorMode: 'bare' },
  { name: 'string', label: 'fn.string.label', hint: 'fn.string.hint', example: 'string()', editorMode: 'bare' },
  { name: 'bit', label: 'fn.bit.label', hint: 'fn.bit.hint', example: 'bit()', editorMode: 'bare' },
  { name: 'bool', label: 'fn.bool.label', hint: 'fn.bool.hint', example: 'bool()', editorMode: 'bare' },
  { name: 'boolean', label: 'fn.boolean.label', hint: 'fn.boolean.hint', example: 'boolean()', editorMode: 'bare' },
] as const satisfies readonly FunctionCatalogEntry[]

type CatalogItem = (typeof FUNCTION_CATALOG)[number]
export type FnKind = CatalogItem['name']

const toFnRecord = <T>(pick: (entry: CatalogItem) => T): Record<FnKind, T> =>
  FUNCTION_CATALOG.reduce(
    (accumulator, entry) => {
      accumulator[entry.name] = pick(entry)
      return accumulator
    },
    {} as Record<FnKind, T>, // SAFETY: reduce accumulator seeded as empty record; populated with all FnKind keys during iteration
  )

export const FUNCTION_NAMES = FUNCTION_CATALOG.map((entry) => entry.name) as FnKind[] // SAFETY: filter guarantees only valid FnKind entries remain
export const FUNCTION_DEFINITIONS_BY_NAME = toFnRecord((entry) => entry)
export const FUNCTION_LABELS = toFnRecord((entry) => entry.label)
export const FUNCTION_HINTS = toFnRecord((entry) => entry.hint)
export const FUNCTION_EXAMPLES = toFnRecord((entry) => entry.example)
export const FUNCTION_EDITOR_MODES = toFnRecord((entry) => entry.editorMode)
export const WHEN_CONDITION_FUNCTION_NAMES = FUNCTION_CATALOG.filter(
  (entry) => 'supportsWhenCondition' in entry && entry.supportsWhenCondition,
).map((entry) => entry.name) as FnKind[] // SAFETY: filter guarantees only valid FnKind entries remain

const WHEN_CONDITION_FUNCTION_SET = new Set<FnKind>(WHEN_CONDITION_FUNCTION_NAMES)

export const DEFAULT_FUNCTION_KIND: FnKind = 'choiceWeighted'
export const DEFAULT_FUNCTION_FALLBACK: FnKind = 'uuid'
export const DEFAULT_WHEN_CONDITION_KIND: FnKind = 'gt'

export const isFnKind = (candidate: string): candidate is FnKind =>
  Object.prototype.hasOwnProperty.call(FUNCTION_DEFINITIONS_BY_NAME, candidate)

export const isWhenConditionFnKind = (candidate: string): candidate is FnKind =>
  WHEN_CONDITION_FUNCTION_SET.has(candidate as FnKind) // SAFETY: candidate is checked against WHEN_CONDITION_FUNCTION_SET which contains FnKind values

export const buildFnExpression = (
  fnName: FnKind,
  args: {
    leftArg: string
    rightArg: string
    min: string
    max: string
    choiceValuesRaw: string
    weightedRows: Array<{ value: string; weight: string }>
  },
): string => {
  const editorMode = FUNCTION_EDITOR_MODES[fnName]
  if (editorMode === 'bare') {
    return `${fnName}()`
  }
  if (editorMode === 'range') {
    return `${fnName}(${args.min},${args.max})`
  }
  if (editorMode === 'choice') {
    const body = args.choiceValuesRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(',')
    return `${fnName}(${body})`
  }
  if (editorMode === 'choiceWeighted') {
    const body = args.weightedRows
      .filter((row) => row.value.trim().length > 0 && row.weight.trim().length > 0)
      .map((row) => `${row.value}:${row.weight}`)
      .join(',')
    return `${fnName}(${body})`
  }
  return `${fnName}(${args.leftArg},${args.rightArg})`
}

export const buildDefaultStateFnExpressionByName = (
  fnName: string,
  sourceField: string,
  targetStatePath: string,
): string => {
  const normalized = fnName.trim() || DEFAULT_FUNCTION_FALLBACK
  if (!isFnKind(normalized)) {
    return `${normalized}(state.${targetStatePath || 'entity.value'},.${sourceField || 'value'})`
  }

  const source = sourceField || 'value'
  const target = targetStatePath || 'entity.value'
  const stateValue = `state.${target}`
  const eventValue = `.${source}`
  const editorMode = FUNCTION_EDITOR_MODES[normalized]

  if (editorMode === 'bare') {
    return `${normalized}()`
  }
  if (editorMode === 'choice') {
    return `${normalized}(A,B,C)`
  }
  if (editorMode === 'choiceWeighted') {
    return `${normalized}(10:50,20:30,30:20)`
  }
  if (editorMode === 'range') {
    return `${normalized}(1,100)`
  }

  return `${normalized}(${stateValue},${eventValue})`
}
