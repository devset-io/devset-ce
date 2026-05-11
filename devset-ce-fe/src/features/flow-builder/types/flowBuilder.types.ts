/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { Edge, Node } from '@xyflow/react'

export type DslValue = string | number | { $fn: string } | { $ref: string } | { $path: string }
export type EmitValue = true | false | null | { $fn: string }

export type BuilderNodeData = {
  title: string
  stage: string
  event: string
  source: 'none' | 'previous-stage'
  emit: EmitValue
  repeat?: number
  color: string
  onDeleteStage?: () => void
  isStart?: boolean
  isEnd?: boolean
  orderLabel?: string
  stateLinksCount?: number
  hasStateLinks?: boolean
  hasQuery?: boolean
}

export type BuilderNode = Node<BuilderNodeData>
export type BuilderEdge = Edge

export type FlowBuilderBootstrap = {
  id: string
  isPersisted?: boolean
  producerName: string
  topic: string
  executions: number
  workflowState: WorkflowState
  nodes: BuilderNode[]
  edges: BuilderEdge[]
  setOverridesByNode?: Record<string, Record<string, unknown>>
  headerOverridesByNode?: Record<string, Record<string, string>>
  waitOverridesByNode?: Record<string, string>
  wireFormatOverridesByNode?: Record<string, StageWireFormat>
  stateOverridesByNode?: Record<string, Record<string, unknown>>
  repeatOverridesByNode?: Record<string, RepeatOverrides>
  queryOverridesByNode?: Record<string, QueryConfig>
}

export type StateNodeData = {
  title: string
  totalStateFields: number
  pipelineStateFields: number
  onOpenEditor: () => void
}

export type WorkflowStateValue = string | number | boolean | null | Record<string, unknown> | unknown[]
export type WorkflowState = Record<string, WorkflowStateValue>

export type StageWireFormatPrefixSource = 'messageType' | 'messagePrefix'

export type StageWireFormat = {
  type: 'binary-prefix'
  prefix: {
    size: 2
    source: StageWireFormatPrefixSource
    value?: number
  }
}

export type QueryFindEntry = {
  id: string
  field: string
  op: string
  value: QueryValue
  default?: QueryValue
}

export type QueryValue = {
  kind: 'literal' | 'path' | 'fn'
  value: unknown
}

export type QuerySelectEntry = {
  id: string
  statePath: string
  field: string
  default?: QueryValue
}

export type QueryConfig = {
  connection: string
  database: string
  collection: string
  find: QueryFindEntry[]
  select: QuerySelectEntry[]
}

export type DslStage = {
  stage: string
  event?: string
  schemaId?: string
  source: 'none' | 'previous-stage'
  repeat?: number
  repeatWhile?: Record<string, unknown>
  repeatUntil?: Record<string, unknown>
  query?: Record<string, unknown>
  set?: Record<string, unknown>
  state?: Record<string, unknown>
  key?: string | Record<string, unknown> | null
  headers?: Record<string, string>
  emit: EmitValue
  wait?: string
  wireFormat?: StageWireFormat
}

export type RepeatOverrides = {
  repeat?: number | null
  repeatWhileFn?: string | null
  repeatUntilFn?: string | null
}

export type DslPayload = {
  id: string
  messageType?: 'kafka' | 'rabbit'
  contentType?: 'application/json' | 'application/x-protobuf'
  producerName: string
  topic: string | null
  routingKey?: string | null
  exchange?: string | null
  schemaId?: string | null
  executions: number
  state: WorkflowState
  pipeline: DslStage[]
}

export type ExistingWorkflowOption = {
  id: string
  label: string
  description?: string
}

export type EventSchema = {
  $schema: string
  title: string
  type: string
  properties: Record<string, unknown>
}

export type SchemaPayloadType = 'json' | 'protobuf'
export type SchemaPayload = Record<string, unknown> | string

export type LoadedSchema = {
  id: string
  version: number
  event: string
  fileName: string
  schemaType: SchemaPayloadType | null
  schema: SchemaPayload
}

export type FieldOverride = {
  mode: 'fn' | 'literal' | 'ref' | 'path' | 'when'
  value: string
  literalKind?: 'string' | 'number' | 'boolean' | 'null' | 'json'
  whenCondition?: string
  whenValueRaw?: string
  whenHasDefault?: boolean
  whenDefaultRaw?: string
}

export type FnOverrides = Record<string, FieldOverride>

export type FieldOverridePayload = {
  mode: 'fn' | 'literal' | 'ref' | 'path' | 'when'
  value: string
  literalKind?: 'string' | 'number' | 'boolean' | 'null' | 'json'
  whenCondition?: string
  whenValueRaw?: string
  whenHasDefault?: boolean
  whenDefaultRaw?: string
}

export type SetEntry = {
  field: string
  kind: 'fn' | 'ref' | 'path' | 'literal' | 'when'
  preview: string
  rawValue: unknown
  isContainer?: boolean
  isRequired?: boolean
  isMissingRequired?: boolean
}
