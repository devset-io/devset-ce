/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { MarkerType } from '@xyflow/react'
import { trimOr } from '../../../shared/utils/string-normalization'
import { NODE_PALETTE } from '../config/node-palette.config'
import {
  DEFAULT_EXECUTIONS,
  DEFAULT_PRODUCER_NAME,
  DEFAULT_TOPIC,
  generateDefaultWorkflowId,
} from '../constants'
import type {
  BuilderEdge,
  BuilderNode,
  DslPayload,
  DslStage,
  EmitValue,
  FlowBuilderBootstrap,
  QueryConfig,
  QuerySelectEntry,
  QueryFindEntry,
  RepeatOverrides,
  StageWireFormat,
  WorkflowState,
} from '../types'
import { createClientId } from '../../../shared/utils/create-client-id'

const NODE_START_X = 80
const NODE_START_Y = 180
const NODE_X_GAP = 380

const toTitle = (stage: string) =>
  stage
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')

const normalizeSource = (source: unknown, index: number): 'none' | 'previous-stage' =>
  source === 'none' || source === 'previous-stage' ? source : index === 0 ? 'none' : 'previous-stage'

const extractFnExpression = (candidate: unknown): string | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }
  const maybeFn = (candidate as { $fn?: unknown }).$fn // SAFETY: accessing optional property on confirmed object value
  return typeof maybeFn === 'string' ? maybeFn : null
}

const isValidEmitValue = (emit: unknown): emit is EmitValue => {
  if (emit === true || emit === false || emit === null) {
    return true
  }
  if (!emit || typeof emit !== 'object' || Array.isArray(emit)) {
    return false
  }
  const maybeFn = (emit as { $fn?: unknown }).$fn // SAFETY: accessing optional property on confirmed object value
  return typeof maybeFn === 'string'
}

const makeUniqueNodeId = (stage: string, index: number, used: Set<string>) => {
  const base = trimOr(stage, `step-${index + 1}`)
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  const next = `${base}-${suffix}`
  used.add(next)
  return next
}

const buildNodesFromPipeline = (pipeline: DslStage[]): BuilderNode[] => {
  const usedIds = new Set<string>()
  return pipeline.map((stage, index) => {
    const nodeId = makeUniqueNodeId(stage.stage, index, usedIds)
    return {
      id: nodeId,
      type: 'builder',
      position: { x: NODE_START_X + index * NODE_X_GAP, y: NODE_START_Y },
      data: {
        title: toTitle(stage.stage),
        stage: stage.stage,
        event: stage.event ?? '',
        source: normalizeSource(stage.source, index),
        emit: isValidEmitValue(stage.emit) ? stage.emit : true,
        repeat: typeof stage.repeat === 'number' ? stage.repeat : undefined,
        color: NODE_PALETTE[index % NODE_PALETTE.length],
        ...(stage.query ? { hasQuery: true } : {}),
      },
    }
  })
}

const buildEdgesFromPipeline = (nodes: BuilderNode[]): BuilderEdge[] => {
  const edges: BuilderEdge[] = []
  for (let index = 1; index < nodes.length; index += 1) {
    edges.push({
      id: `import-e${index}`,
      source: nodes[index - 1].id,
      target: nodes[index].id,
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#2b8a66', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
    })
  }
  return edges
}

const buildStateOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const stateBlock = pipeline[index]?.state
      if (!stateBlock || Object.keys(stateBlock).length === 0) {
        return []
      }
      return [[node.id, structuredClone(stateBlock)]]
    }),
  ) as Record<string, Record<string, unknown>> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

const buildSetOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const setBlock = pipeline[index]?.set
      if (!setBlock || Object.keys(setBlock).length === 0) {
        return []
      }
      return [[node.id, structuredClone(setBlock)]]
    }),
  ) as Record<string, Record<string, unknown>> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

const buildHeaderOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const headersBlock = pipeline[index]?.headers
      if (!headersBlock || Object.keys(headersBlock).length === 0) {
        return []
      }
      return [[node.id, structuredClone(headersBlock)]]
    }),
  ) as Record<string, Record<string, string>> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

const buildWaitOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const wait = pipeline[index]?.wait
      if (!wait) {
        return []
      }
      return [[node.id, wait]]
    }),
  ) as Record<string, string> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

const buildRepeatOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const stage = pipeline[index]
      const override: RepeatOverrides = {}
      if (typeof stage?.repeat === 'number') {
        override.repeat = stage.repeat
      }
      const repeatWhileFn = extractFnExpression(stage?.repeatWhile)
      const repeatUntilFn = extractFnExpression(stage?.repeatUntil)
      if (repeatWhileFn) {
        override.repeatWhileFn = repeatWhileFn
      }
      if (repeatUntilFn) {
        override.repeatUntilFn = repeatUntilFn
      }
      if (Object.keys(override).length === 0) {
        return []
      }
      return [[node.id, override]]
    }),
  ) as Record<string, RepeatOverrides> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

const normalizeStageWireFormat = (candidate: unknown): StageWireFormat | null => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null
  }
  const wireFormat = candidate as { // SAFETY: accessing optional properties on confirmed object value
    type?: unknown
    prefix?: {
      source?: unknown
      value?: unknown
    }
  }
  if (wireFormat.type !== 'binary-prefix') {
    return null
  }
  if (!wireFormat.prefix || typeof wireFormat.prefix !== 'object') {
    return null
  }

  const source = wireFormat.prefix.source
  if (source === 'messageType') {
    return {
      type: 'binary-prefix',
      prefix: {
        size: 2,
        source: 'messageType',
      },
    }
  }
  if (source === 'messagePrefix') {
    const value = wireFormat.prefix.value
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 65535) {
      return null
    }
    return {
      type: 'binary-prefix',
      prefix: {
        size: 2,
        source: 'messagePrefix',
        value: Math.floor(value),
      },
    }
  }
  return null
}

const buildWireFormatOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const wireFormat = normalizeStageWireFormat(pipeline[index]?.wireFormat)
      if (!wireFormat) {
        return []
      }
      return [[node.id, wireFormat]]
    }),
  ) as Record<string, StageWireFormat> // SAFETY: Object.fromEntries loses type info; entries are [string, Record] pairs by construction

// ── Query override reconstruction from DSL ──────────────────

const parseDslQueryValue = (val: unknown): { kind: 'literal' | 'path'; value: unknown } => {
  if (val && typeof val === 'object' && '$path' in val) {
    const obj = val as { $path: string; default?: unknown }
    return { kind: 'path', value: obj.$path }
  }
  return { kind: 'literal', value: val }
}

const reconstructQuerySelect = (select: Record<string, unknown>): QuerySelectEntry[] =>
  Object.entries(select).map(([statePath, value]) => {
    if (typeof value === 'string') {
      return { id: createClientId(), statePath, field: value }
    }
    const obj = value as { field: string; default?: unknown } // SAFETY: DSL select entry is either string or { field, default? }
    const entry: QuerySelectEntry = { id: createClientId(), statePath, field: obj.field }
    if (obj.default !== undefined) {
      entry.default = parseDslQueryValue(obj.default)
    }
    return entry
  })

const reconstructQueryFind = (find: Record<string, unknown>): QueryFindEntry[] =>
  Object.entries(find).map(([field, value]) => {
    // Operator wrapped: { "$gt": value }
    if (value && typeof value === 'object' && !('$path' in value)) {
      const keys = Object.keys(value as Record<string, unknown>)
      const op = keys.find((k) => k.startsWith('$'))
      if (op) {
        const inner = (value as Record<string, unknown>)[op]
        return { id: createClientId(), field, op, value: parseDslQueryValue(inner) }
      }
    }
    // Simple equality
    return { id: createClientId(), field, op: '$eq', value: parseDslQueryValue(value) }
  })

const buildQueryOverridesByNode = (nodes: BuilderNode[], pipeline: DslStage[]) =>
  Object.fromEntries(
    nodes.flatMap((node, index) => {
      const queryBlock = pipeline[index]?.query
      if (!queryBlock || typeof queryBlock !== 'object') return []
      const q = queryBlock as { connection?: string; database?: string; collection?: string; find?: Record<string, unknown>; select?: Record<string, unknown> }
      if (!q.select || Object.keys(q.select).length === 0) return []
      const config: QueryConfig = {
        connection: typeof q.connection === 'string' ? q.connection : '',
        database: typeof q.database === 'string' ? q.database : '',
        collection: typeof q.collection === 'string' ? q.collection : '',
        find: q.find ? reconstructQueryFind(q.find) : [],
        select: reconstructQuerySelect(q.select),
      }
      return [[node.id, config]]
    }),
  ) as Record<string, QueryConfig> // SAFETY: Object.fromEntries loses type info; entries are [string, QueryConfig] pairs by construction

export const createEmptyBootstrap = (): FlowBuilderBootstrap => ({
  id: generateDefaultWorkflowId(),
  isPersisted: false,
  producerName: DEFAULT_PRODUCER_NAME,
  topic: DEFAULT_TOPIC,
  executions: DEFAULT_EXECUTIONS,
  workflowState: {},
  nodes: [],
  edges: [],
})

export const parseDslPayloadFromJson = (raw: string): DslPayload => {
  const parsed = JSON.parse(raw) as Partial<DslPayload> // SAFETY: raw is expected JSON string; Partial allows safe field access
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Payload musi byc obiektem')
  }
  if (!Array.isArray(parsed.pipeline)) {
    throw new Error('Payload musi zawierac pipeline[]')
  }
  if (parsed.pipeline.length === 0) {
    throw new Error('Payload pipeline[] nie moze byc puste')
  }
  if (parsed.state !== undefined && (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state))) {
    throw new Error('Pole state w payloadzie musi byc obiektem')
  }
  parsed.pipeline.forEach((stage, index) => {
    const candidate = stage as Partial<DslStage> // SAFETY: stage is array element of unknown shape; Partial allows safe validation below
    // Query-only stages don't have emit — skip validation for them
    if (candidate.query) return
    if (!isValidEmitValue(candidate.emit)) {
      throw new Error(`Niepoprawne emit w pipeline[${index}]`)
    }
  })

  return {
    id: typeof parsed.id === 'string' ? parsed.id : 'imported-workflow',
    producerName: typeof parsed.producerName === 'string' ? parsed.producerName : DEFAULT_PRODUCER_NAME,
    topic: typeof parsed.topic === 'string' ? parsed.topic : DEFAULT_TOPIC,
    executions: typeof parsed.executions === 'number' ? parsed.executions : DEFAULT_EXECUTIONS,
    state: (parsed.state as WorkflowState | undefined) ?? {}, // SAFETY: state field shape validated by preceding pipeline check
    pipeline: parsed.pipeline as DslStage[], // SAFETY: pipeline validated as array of stage objects above
  }
}

export const createBootstrapFromPayload = (
  payload: DslPayload,
  options?: { isPersisted?: boolean },
): FlowBuilderBootstrap => {
  const nodes = buildNodesFromPipeline(payload.pipeline)
  const edges = buildEdgesFromPipeline(nodes)
  return {
    id: payload.id || 'imported-workflow',
    isPersisted: options?.isPersisted ?? false,
    producerName: payload.producerName || DEFAULT_PRODUCER_NAME,
    topic: payload.topic || DEFAULT_TOPIC,
    executions: typeof payload.executions === 'number' ? payload.executions : DEFAULT_EXECUTIONS,
    workflowState: structuredClone(payload.state ?? {}),
    nodes,
    edges,
    setOverridesByNode: buildSetOverridesByNode(nodes, payload.pipeline),
    headerOverridesByNode: buildHeaderOverridesByNode(nodes, payload.pipeline),
    waitOverridesByNode: buildWaitOverridesByNode(nodes, payload.pipeline),
    wireFormatOverridesByNode: buildWireFormatOverridesByNode(nodes, payload.pipeline),
    stateOverridesByNode: buildStateOverridesByNode(nodes, payload.pipeline),
    repeatOverridesByNode: buildRepeatOverridesByNode(nodes, payload.pipeline),
    queryOverridesByNode: buildQueryOverridesByNode(nodes, payload.pipeline),
  }
}
