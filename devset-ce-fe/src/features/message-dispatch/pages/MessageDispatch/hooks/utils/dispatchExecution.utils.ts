/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { parseWireFormatPrefixValue } from '../../../../message-dispatch.utils'
import type { StageWireFormat } from '../../../../../flow-builder/types'
import type {
  SingleRequestPayload,
  SingleStepExecuteRequest,
} from '../../../../services/message-dispatch.service'
import type { DispatchHeaderRow, LoadedHistoryMetadata, RepoProtoSchema } from '../../../../types'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

type BuildWireFormatResult = {
  type: 'binary-prefix'
  prefix: {
    size: 2
    source: 'messagePrefix'
    value: number
  }
}

export type LoadedDispatchDraft = {
  producerName: string
  isProtobuf: boolean
  topic: string | null
  routingKey: string | null
  exchange: string | null
  kafkaKey: string | null
  headers: Record<string, unknown>
  state: Record<string, unknown>
  metadata: LoadedHistoryMetadata
  loadedFromHistoryId: string | null
  wireFormat?: SingleStepExecuteRequest['wireFormat']
}

const buildWireFormat = (prefixValue: number): BuildWireFormatResult => ({
  type: 'binary-prefix',
  prefix: {
    size: 2,
    source: 'messagePrefix',
    value: prefixValue,
  },
})

export const parseStepState = (
  stepStateRaw: string,
  t: TranslateFn,
): Record<string, unknown> => {
  const parsed = JSON.parse(stepStateRaw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(t('dispatch.execution.stateMustBeObject'))
  }
  if (Object.keys(parsed).length === 0) {
    throw new Error(t('dispatch.execution.stateMustBeNonEmpty'))
  }
  return parsed as Record<string, unknown> // SAFETY: parsed confirmed as non-null non-array object by preceding guards
}

export const parseStepStateLenient = (stepStateRaw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(stepStateRaw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown> // SAFETY: parsed confirmed as non-null non-array object by preceding guards
    }
    return {}
  } catch {
    // Intentional: invalid JSON step state returns empty object for lenient downstream processing
    return {}
  }
}

export const toHeadersRecord = (rows: DispatchHeaderRow[]): Record<string, string> =>
  rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.key.trim()
    if (!key) {
      return acc
    }
    acc[key] = row.value
    return acc
  }, {})

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const resolveExecutionCount = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 1

export const resolveDispatchWireFormat = ({
  isProtobuf,
  wireFormatEnabled,
  wireFormatPrefixValue,
  onInvalidPrefix,
  t,
}: {
  isProtobuf: boolean
  wireFormatEnabled: boolean
  wireFormatPrefixValue: string
  onInvalidPrefix: () => void
  t: TranslateFn
}): SingleStepExecuteRequest['wireFormat'] => {
  if (!isProtobuf || !wireFormatEnabled) {
    return undefined
  }

  const parsedWireFormatPrefix = parseWireFormatPrefixValue(wireFormatPrefixValue)
  if (parsedWireFormatPrefix === null) {
    onInvalidPrefix()
    throw new Error(t('dispatch.execution.wireFormatPrefixRange'))
  }

  return buildWireFormat(parsedWireFormatPrefix)
}

export const resolveSavedRequestWireFormat = ({
  isProtobuf,
  wireFormatEnabled,
  wireFormatPrefixValue,
}: {
  isProtobuf: boolean
  wireFormatEnabled: boolean
  wireFormatPrefixValue: string
}): SingleRequestPayload['wireFormat'] => {
  if (!isProtobuf || !wireFormatEnabled) {
    return { type: 'none' }
  }

  const parsedWireFormatPrefix = parseWireFormatPrefixValue(wireFormatPrefixValue)
  return typeof parsedWireFormatPrefix === 'number'
    ? buildWireFormat(parsedWireFormatPrefix)
    : { type: 'none' }
}

// ──────────────────────────────────────────────────────────────
// Hydration patch helpers
//
// Pure functions that produce Partial<MessageDispatchState> patches
// for bulk hydration actions (draftHydratedFromHistory / draftHydratedFromSavedRequest).
// ──────────────────────────────────────────────────────────────

type WireFormatPatch = Pick<
  MessageDispatchState,
  'wireFormatEnabled' | 'wireFormatPrefixSource' | 'wireFormatPrefixValue' | 'wireFormatPrefixValueError'
>

export const toWireFormatPatch = (wireFormat: StageWireFormat | undefined): WireFormatPatch => {
  if (
    wireFormat?.type === 'binary-prefix' &&
    wireFormat.prefix.source === 'messagePrefix' &&
    typeof wireFormat.prefix.value === 'number'
  ) {
    return {
      wireFormatEnabled: true,
      wireFormatPrefixSource: 'messagePrefix',
      wireFormatPrefixValue: String(wireFormat.prefix.value),
      wireFormatPrefixValueError: null,
    }
  }

  return {
    wireFormatEnabled: false,
    wireFormatPrefixSource: 'messagePrefix',
    wireFormatPrefixValue: '0',
    wireFormatPrefixValueError: null,
  }
}

export const toProtobufSchemaHydrationPatch = ({
  schemaId,
  protoSchema,
  repoFallbackSchemaId,
  findRepoProtoSchema,
}: {
  schemaId: string | null
  protoSchema: string | null
  repoFallbackSchemaId?: string
  findRepoProtoSchema: (id: string) => RepoProtoSchema | null
}): Partial<MessageDispatchState> => {
  const protoFromHistory = protoSchema?.trim()
  const protoFromRepo = repoFallbackSchemaId
    ? findRepoProtoSchema(repoFallbackSchemaId)?.schema?.trim()
    : ''
  const resolvedProtoSchema = protoFromHistory || protoFromRepo

  if (resolvedProtoSchema) {
    return {
      schemaSource: 'none',
      selectedSchemaId: schemaId ?? '',
      customProtoSchemaRaw: resolvedProtoSchema,
      appliedProtoSchemaRaw: resolvedProtoSchema,
      protoSchemaChoice: schemaId && protoFromRepo ? schemaId : '__manual__',
      isProtoBaseApplied: true,
      isProtoResyncRequired: false,
      isProtoSchemaCollapsed: true,
      payloadEditorMode: 'raw',
    }
  }

  return {
    schemaSource: 'none',
    selectedSchemaId: schemaId ?? '',
    isProtoBaseApplied: false,
    appliedProtoSchemaRaw: '',
    protoSchemaChoice: '__manual__',
  }
}

export const toJsonSchemaHydrationPatch = ({
  schemaId,
  useRepoSchema,
}: {
  schemaId: string | null
  useRepoSchema: boolean
}): Partial<MessageDispatchState> => ({
  schemaSource: useRepoSchema && schemaId ? 'repo' : 'none',
  selectedSchemaId: useRepoSchema && schemaId ? schemaId : '',
  isProtoBaseApplied: false,
  appliedProtoSchemaRaw: '',
})
