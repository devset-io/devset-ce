/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { LoadedSchema } from '../../flow-builder/types'

export type ContentMode = 'json' | 'protobuf'
export type SchemaSource = 'none' | 'repo'
export type PayloadEditorMode = 'raw' | 'function-studio'
export type RepoProtoSchema = LoadedSchema & { schemaType: 'protobuf'; schema: string }
export type DispatchHeaderRow = { id: string; key: string; value: string }
export type { KeyValueKind as DispatchKeyKind } from '../../../shared/types/key-value.types'

export type LoadedHistoryMetadata = {
  workflowId?: string
  executions: number
  stage: string
  event: string
  headers: Record<string, unknown>
  workflowState?: Record<string, unknown>
  protobufRootMessage?: string
}

export type HistoryMessageTypeFilter = 'all' | 'kafka' | 'rabbit'
export type HistoryContentTypeFilter = 'all' | 'application/json' | 'application/x-protobuf'
