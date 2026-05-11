/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { Edge } from '@xyflow/react'
import type {
  BuilderNode,
  BuilderNodeData,
  DslStage,
  FnOverrides,
  QueryConfig,
  QueryFindEntry,
  QuerySelectEntry,
  QueryValue,
  RepeatOverrides,
  StageWireFormat,
} from '../types'
import { setValueAtPath } from '../path-utils'
import { normalizeFunctionCallExpression } from '../function-call.utils'
import { safeJsonParse } from '../../../shared/utils/safeJsonParse'

export const NODE_PALETTE = ['#2f9e66', '#168aad', '#4d908e', '#90be6d', '#43aa8b']

export const applyFnOverrides = (setBlock: Record<string, unknown>, fnOverrides?: FnOverrides) => {
  if (!fnOverrides) {
    return setBlock
  }
  const nextSet = structuredClone(setBlock)

  const parseRawDslValue = (raw: string | undefined): unknown => {
    if (raw === undefined) {
      return null
    }
    const trimmed = raw.trim()
    if (!trimmed) {
      return ''
    }
    return safeJsonParse(trimmed, trimmed)
  }

  Object.entries(fnOverrides).forEach(([fieldPath, override]) => {
    if (override.mode === 'fn') {
      setValueAtPath(nextSet, fieldPath, { $fn: normalizeFunctionCallExpression(override.value) })
      return
    }
    if (override.mode === 'ref') {
      setValueAtPath(nextSet, fieldPath, { $ref: override.value.trim() })
      return
    }
    if (override.mode === 'path') {
      setValueAtPath(nextSet, fieldPath, { $path: override.value.trim() })
      return
    }
    if (override.mode === 'when') {
      const conditionalBlock: Record<string, unknown> = {
        when: { $fn: (override.whenCondition ?? 'eq(1,1)').trim() },
        value: parseRawDslValue(override.whenValueRaw ?? override.value),
      }
      if (override.whenHasDefault) {
        conditionalBlock.default = parseRawDslValue(override.whenDefaultRaw)
      }
      setValueAtPath(nextSet, fieldPath, conditionalBlock)
      return
    }

    if (override.literalKind === 'null') {
      setValueAtPath(nextSet, fieldPath, null)
      return
    }
    if (override.literalKind === 'boolean') {
      setValueAtPath(nextSet, fieldPath, override.value.trim() === 'true')
      return
    }
    if (override.literalKind === 'number') {
      setValueAtPath(nextSet, fieldPath, Number(override.value))
      return
    }
    if (override.literalKind === 'json') {
      setValueAtPath(nextSet, fieldPath, safeJsonParse(override.value, override.value))
      return
    }
    if (override.literalKind === 'string') {
      setValueAtPath(nextSet, fieldPath, override.value)
      return
    }

    const raw = override.value.trim()
    if (raw === 'true') {
      setValueAtPath(nextSet, fieldPath, true)
      return
    }
    if (raw === 'false') {
      setValueAtPath(nextSet, fieldPath, false)
      return
    }
    if (raw === 'null') {
      setValueAtPath(nextSet, fieldPath, null)
      return
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      setValueAtPath(nextSet, fieldPath, Number(raw))
      return
    }
    if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
      setValueAtPath(nextSet, fieldPath, safeJsonParse(raw, raw))
      return
    }
    setValueAtPath(nextSet, fieldPath, raw)
  })
  return nextSet
}

// ── Query compilation helpers ────────────────────────────────

const compileQueryValue = (v: QueryValue | undefined): unknown => {
  if (!v) return null
  if (v.kind === 'path') return { $path: v.value as string }
  if (v.kind === 'fn') return { $fn: v.value as string }
  return v.value
}

// `default` is only meaningful for `$path` values (fallback when path missing in state).
// UI in FindRow enforces this; we mirror it in the DSL output.
const compileQueryFind = (find: QueryFindEntry[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const f of find) {
    const hasPathDefault = f.default && f.value?.kind === 'path'
    const inner = hasPathDefault
      ? { $path: f.value.value as string, default: compileQueryValue(f.default) }
      : compileQueryValue(f.value)
    out[f.field] = f.op === '$eq' ? inner : { [f.op]: inner }
  }
  return out
}

const compileQuerySelect = (select: QuerySelectEntry[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const s of select) {
    if (s.default) {
      out[s.statePath] = { field: s.field, default: compileQueryValue(s.default) }
    } else {
      out[s.statePath] = s.field
    }
  }
  return out
}

const compileQueryConfig = (query: QueryConfig): Record<string, unknown> => ({
  connection: query.connection,
  database: query.database,
  collection: query.collection,
  ...(query.find.length > 0 ? { find: compileQueryFind(query.find) } : {}),
  select: compileQuerySelect(query.select),
})

export type BuildDslStageOverrides = {
  fnOverrides?: FnOverrides
  setOverride?: Record<string, unknown>
  headerOverride?: Record<string, string>
  waitOverride?: string
  wireFormatOverride?: StageWireFormat
  stateOverrides?: Record<string, unknown>
  repeatOverrides?: RepeatOverrides
  queryOverride?: QueryConfig
}

export const buildDslStageFromNode = (
  node: BuilderNode,
  index: number,
  overrides: BuildDslStageOverrides = {},
): DslStage => {
  const {
    fnOverrides,
    setOverride,
    headerOverride,
    waitOverride,
    wireFormatOverride,
    stateOverrides,
    repeatOverrides,
    queryOverride,
  } = overrides

  const normalizedWireFormat = wireFormatOverride
    ? wireFormatOverride.prefix.source === 'messagePrefix'
      ? {
          type: 'binary-prefix' as const,
          prefix: {
            size: 2 as const,
            source: 'messagePrefix' as const,
            value:
              typeof wireFormatOverride.prefix.value === 'number' &&
              Number.isFinite(wireFormatOverride.prefix.value) &&
              wireFormatOverride.prefix.value >= 0 &&
              wireFormatOverride.prefix.value <= 65535
                ? Math.floor(wireFormatOverride.prefix.value)
                : 0,
          },
        }
      : {
          type: 'binary-prefix' as const,
          prefix: {
            size: 2 as const,
            source: 'messageType' as const,
          },
        }
    : null

  const compiledQuery = queryOverride && queryOverride.select.length > 0
    ? compileQueryConfig(queryOverride)
    : null

  // Query nodes emit a minimal DSL stage: just stage + query block.
  if (node.data.hasQuery && compiledQuery) {
    return {
      stage: node.data.stage,
      source: 'none',
      query: compiledQuery,
      emit: false,
    }
  }

  const stage: DslStage = {
    stage: node.data.stage,
    event: node.data.event,
    schemaId: node.data.event,
    source: node.data.source ?? (index === 0 ? 'none' : 'previous-stage'),
    ...(node.data.repeat && node.data.repeat > 1 ? { repeat: node.data.repeat } : {}),
    ...(compiledQuery ? { query: compiledQuery } : {}),
    set: applyFnOverrides(setOverride ?? {}, fnOverrides),
    headers: headerOverride ?? {},
    ...(waitOverride ? { wait: waitOverride } : {}),
    ...(normalizedWireFormat ? { wireFormat: normalizedWireFormat } : {}),
    emit: node.data.emit,
    ...(stateOverrides && Object.keys(stateOverrides).length > 0 ? { state: stateOverrides } : {}),
  }

  if (repeatOverrides) {
    if (Object.prototype.hasOwnProperty.call(repeatOverrides, 'repeat')) {
      if (repeatOverrides.repeat === null) {
        delete stage.repeat
      } else if (typeof repeatOverrides.repeat === 'number' && repeatOverrides.repeat > 0) {
        stage.repeat = repeatOverrides.repeat
      }
    }
    if (Object.prototype.hasOwnProperty.call(repeatOverrides, 'repeatWhileFn')) {
      if (repeatOverrides.repeatWhileFn === null) {
        delete stage.repeatWhile
      } else if (repeatOverrides.repeatWhileFn?.trim()) {
        stage.repeatWhile = { $fn: repeatOverrides.repeatWhileFn.trim() }
      }
    }
    if (Object.prototype.hasOwnProperty.call(repeatOverrides, 'repeatUntilFn')) {
      if (repeatOverrides.repeatUntilFn === null) {
        delete stage.repeatUntil
      } else if (repeatOverrides.repeatUntilFn?.trim()) {
        stage.repeatUntil = { $fn: repeatOverrides.repeatUntilFn.trim() }
      }
    }
  }

  return stage
}

export const sortNodesByCanvasPosition = (nodes: BuilderNode[]) =>
  [...nodes].sort((a, b) => {
    if (a.position.x === b.position.x) {
      return a.position.y - b.position.y
    }
    return a.position.x - b.position.x
  })

export const orderNodesByConnections = (nodes: BuilderNode[], edges: Edge[]): BuilderNode[] => {
  if (nodes.length <= 1) {
    return nodes
  }

  const byPosition = sortNodesByCanvasPosition(nodes)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, string>()
  const outgoing = new Map<string, string>()

  edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target) || edge.source === edge.target) {
      return
    }
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, edge.target)
    }
    if (!incoming.has(edge.target)) {
      incoming.set(edge.target, edge.source)
    }
  })

  const startNode = byPosition.find((node) => !incoming.has(node.id)) ?? byPosition[0]
  const ordered: BuilderNode[] = []
  const visited = new Set<string>()

  let current: BuilderNode | undefined = startNode
  while (current && !visited.has(current.id)) {
    ordered.push(current)
    visited.add(current.id)
    const nextId = outgoing.get(current.id)
    current = nextId ? nodeById.get(nextId) : undefined
  }

  byPosition.forEach((node) => {
    if (!visited.has(node.id)) {
      ordered.push(node)
      visited.add(node.id)
    }
  })

  return ordered
}

export const buildNewStepData = (counter: number, color: string, event: string): BuilderNodeData => ({
  title: `Custom Step ${counter}`,
  stage: `custom-${counter}`,
  event,
  source: 'none',
  emit: true,
  color,
})
