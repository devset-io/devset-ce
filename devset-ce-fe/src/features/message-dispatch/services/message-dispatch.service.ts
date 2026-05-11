/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { normalizeExecutionPlanStatus } from '../../../shared/services/execution-plan-events.service'
import { fetchApi } from '../../../shared/services/http-api.service'
import type { StageWireFormat } from '../../flow-builder/types'

type DispatchMessageType = 'kafka' | 'rabbit'
type DispatchContentType = 'application/json' | 'application/x-protobuf'
export type SingleRequestWireFormat = StageWireFormat | { type: 'none' }

export type CollectionSummary = {
  collectionName: string
}

export type SingleRequestPayload = {
  singleRequestName: string
  collectionName: string
  messageType: DispatchMessageType
  contentType: DispatchContentType
  producerName: string
  topic: string | null
  exchange: string | null
  routingKey: string | null
  executions: number
  stage?: string | null
  event?: string | null
  state: Record<string, unknown>
  headers: Record<string, unknown>
  wireFormat: SingleRequestWireFormat
  workflowState: Record<string, unknown>
  protoSchema?: string | null
}

export type SingleStepExecuteRequest = {
  workflowId?: string
  messageType?: DispatchMessageType
  contentType?: DispatchContentType
  producerName: string
  topic?: string
  key?: string | Record<string, string>
  exchange?: string
  routingKey?: string
  executions?: number
  stage?: string
  event?: string
  state: Record<string, unknown>
  headers?: Record<string, unknown>
  workflowState?: Record<string, unknown>
  schemaId?: string
  protoSchema?: string
  protobufRootMessage?: string
  wireFormat?: StageWireFormat
}

export type SingleStepExecuteResponse = {
  historyId: string
  runId: string
  status: string
  executions: number
  workflowId: string | null
  contentType: string
  schemaId: string | null
  protoSchema: string | null
  protobufRootMessage: string | null
}

export type SingleStepHistoryEntry = {
  id: string
  createdAtEpochMillis: number
  runId: string
  workflowId: string
  messageType: DispatchMessageType
  contentType: string
  producerName: string
  topic: string | null
  key: string | null
  exchange: string | null
  routingKey: string | null
  executions: number
  stage: string
  event: string
  state: Record<string, unknown>
  headers: Record<string, unknown>
  workflowState: Record<string, unknown>
  schemaId: string | null
  protoSchema: string | null
  protobufRootMessage: string | null
  wireFormat?: StageWireFormat
}

export type DispatchRunStatus = {
  runId: string
  status: 'PENDING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'COMPLETED' | 'FAILED'
  failedExecutions: number
  errorMessage: string | null
}

const TERMINAL_STATUSES = new Set<DispatchRunStatus['status']>(['COMPLETED', 'FAILED', 'STOPPED'])

import { msg } from '../../../shared/utils/i18n'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readOptionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const readPositiveInteger = (value: unknown, fallback = 1): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback

const assertExecuteResponse = (payload: unknown): SingleStepExecuteResponse => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(msg('Nieprawidlowy format odpowiedzi execute', 'Invalid execute response format'))
  }
  const candidate = payload as Partial<SingleStepExecuteResponse> // SAFETY: payload confirmed as non-null object; Partial allows safe field validation below
  if (typeof candidate.historyId !== 'string' || !candidate.historyId.trim()) {
    throw new Error(msg('Nieprawidlowa odpowiedz execute: brak historyId', 'Invalid execute response: missing historyId'))
  }
  if (typeof candidate.runId !== 'string' || !candidate.runId.trim()) {
    throw new Error(msg('Nieprawidlowa odpowiedz execute: brak runId', 'Invalid execute response: missing runId'))
  }
  if (typeof candidate.status !== 'string' || !candidate.status.trim()) {
    throw new Error(msg('Nieprawidlowa odpowiedz execute: brak statusu', 'Invalid execute response: missing status'))
  }
  return {
    historyId: candidate.historyId,
    runId: candidate.runId,
    status: candidate.status,
    executions: typeof candidate.executions === 'number' && candidate.executions > 0 ? candidate.executions : 1,
    workflowId: readOptionalText(candidate.workflowId),
    contentType:
      typeof candidate.contentType === 'string' && candidate.contentType.trim().length > 0
        ? candidate.contentType
        : 'application/json',
    schemaId: readOptionalText(candidate.schemaId),
    protoSchema: readOptionalText(candidate.protoSchema),
    protobufRootMessage: readOptionalText(candidate.protobufRootMessage),
  }
}

const assertRunStatus = (payload: unknown): DispatchRunStatus => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(msg('Nieprawidlowy format odpowiedzi statusu runa', 'Invalid run status response format'))
  }
  const candidate = payload as Partial<DispatchRunStatus> // SAFETY: payload confirmed as non-null object; Partial allows safe field validation below
  if (typeof candidate.runId !== 'string' || !candidate.runId.trim()) {
    throw new Error(msg('Nieprawidlowa odpowiedz statusu runa: brak runId', 'Invalid run status response: missing runId'))
  }
  if (typeof candidate.status !== 'string' || !candidate.status.trim()) {
    throw new Error(msg('Nieprawidlowa odpowiedz statusu runa: brak statusu', 'Invalid run status response: missing status'))
  }

  return {
    runId: candidate.runId,
    status: normalizeExecutionPlanStatus(candidate.status),
    failedExecutions: typeof candidate.failedExecutions === 'number' ? candidate.failedExecutions : 0,
    errorMessage: typeof candidate.errorMessage === 'string' ? candidate.errorMessage : null,
  }
}

const normalizeWireFormat = (value: unknown): StageWireFormat | undefined => {
  if (!isRecord(value) || value.type !== 'binary-prefix' || !isRecord(value.prefix)) {
    return undefined
  }

  if (value.prefix.size !== 2) {
    return undefined
  }

  if (value.prefix.source === 'messageType') {
    return {
      type: 'binary-prefix',
      prefix: {
        size: 2,
        source: 'messageType',
      },
    }
  }

  if (value.prefix.source !== 'messagePrefix') {
    return undefined
  }

  if (
    typeof value.prefix.value !== 'number' ||
    !Number.isFinite(value.prefix.value) ||
    value.prefix.value < 0 ||
    value.prefix.value > 65535
  ) {
    return undefined
  }

  return {
    type: 'binary-prefix',
    prefix: {
      size: 2,
      source: 'messagePrefix',
      value: Math.floor(value.prefix.value),
    },
  }
}

const normalizeSingleRequestWireFormat = (value: unknown): SingleRequestWireFormat => {
  const parsed = normalizeWireFormat(value)
  if (parsed) {
    return parsed
  }
  return { type: 'none' }
}

const readStateWireFormat = (value: unknown): StageWireFormat | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  return normalizeWireFormat(value.wireFormat)
}

const readPipelineWireFormat = (value: unknown): StageWireFormat | undefined => {
  if (!Array.isArray(value) || value.length === 0 || !isRecord(value[0])) {
    return undefined
  }
  return normalizeWireFormat((value[0] as Record<string, unknown>).wireFormat) // SAFETY: value[0] confirmed as object by Array.isArray and length check above
}

const toHistoryEntry = (payload: unknown): SingleStepHistoryEntry | null => {
  if (!isRecord(payload)) {
    return null
  }

  const id = readOptionalText(payload.id)
  const runId = readOptionalText(payload.runId)
  const workflowId = readOptionalText(payload.workflowId)
  const producerName = readOptionalText(payload.producerName)
  const stage = readOptionalText(payload.stage)
  const event = readOptionalText(payload.event)
  const messageType = payload.messageType === 'rabbit' ? 'rabbit' : payload.messageType === 'kafka' ? 'kafka' : null

  if (!id || !runId || !workflowId || !producerName || !stage || !event || !messageType) {
    return null
  }

  return {
    id,
    createdAtEpochMillis:
      typeof payload.createdAtEpochMillis === 'number' && Number.isFinite(payload.createdAtEpochMillis)
        ? payload.createdAtEpochMillis
        : 0,
    runId,
    workflowId,
    messageType,
    contentType:
      typeof payload.contentType === 'string' && payload.contentType.trim().length > 0
        ? payload.contentType
        : 'application/json',
    producerName,
    topic: readOptionalText(payload.topic),
    key: readOptionalText(payload.key),
    exchange: readOptionalText(payload.exchange),
    routingKey: readOptionalText(payload.routingKey),
    executions: typeof payload.executions === 'number' && payload.executions > 0 ? payload.executions : 1,
    stage,
    event,
    state: isRecord(payload.state) ? payload.state : {},
    headers: isRecord(payload.headers) ? payload.headers : {},
    workflowState: isRecord(payload.workflowState) ? payload.workflowState : {},
    schemaId: readOptionalText(payload.schemaId),
    protoSchema: readOptionalText(payload.protoSchema),
    protobufRootMessage: readOptionalText(payload.protobufRootMessage),
    wireFormat:
      normalizeWireFormat(payload.wireFormat) ??
      readStateWireFormat(payload.state) ??
      readPipelineWireFormat(payload.pipeline),
  }
}

const toCollectionSummary = (payload: unknown): CollectionSummary | null => {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return { collectionName: payload.trim() }
  }
  if (!isRecord(payload)) {
    return null
  }
  const collectionName = readOptionalText(payload.collectionName) ?? readOptionalText(payload.name)
  if (!collectionName) {
    return null
  }
  return { collectionName }
}

const toSingleRequestPayload = (payload: unknown): SingleRequestPayload | null => {
  if (!isRecord(payload)) {
    return null
  }

  const singleRequestName = readOptionalText(payload.singleRequestName) ?? readOptionalText(payload.name)
  const collectionName = readOptionalText(payload.collectionName)
  const producerName = readOptionalText(payload.producerName)
  const messageType = payload.messageType === 'rabbit' ? 'rabbit' : payload.messageType === 'kafka' ? 'kafka' : null

  if (!singleRequestName || !collectionName || !producerName || !messageType) {
    return null
  }

  return {
    singleRequestName,
    collectionName,
    messageType,
    contentType: payload.contentType === 'application/x-protobuf' ? 'application/x-protobuf' : 'application/json',
    producerName,
    topic: readOptionalText(payload.topic),
    exchange: readOptionalText(payload.exchange),
    routingKey: readOptionalText(payload.routingKey),
    executions: readPositiveInteger(payload.executions, 1),
    stage: readOptionalText(payload.stage),
    event: readOptionalText(payload.event),
    state: isRecord(payload.state) ? payload.state : {},
    headers: isRecord(payload.headers) ? payload.headers : {},
    wireFormat: normalizeSingleRequestWireFormat(payload.wireFormat),
    workflowState: isRecord(payload.workflowState) ? payload.workflowState : {},
    protoSchema: readOptionalText(payload.protoSchema),
  }
}

const readSingleRequestsArray = (payload: unknown): SingleRequestPayload[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toSingleRequestPayload(entry))
      .filter((entry): entry is SingleRequestPayload => entry !== null)
  }
  if (isRecord(payload) && Array.isArray(payload.singleRequests)) {
    return payload.singleRequests
      .map((entry) => toSingleRequestPayload(entry))
      .filter((entry): entry is SingleRequestPayload => entry !== null)
  }
  return []
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const readOptionalJson = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  } catch {
    // Intentional: response may not contain valid JSON — return null for non-JSON responses
    return null
  }
}

export const executeSingleStep = async (
  payload: SingleStepExecuteRequest,
  signal?: AbortSignal,
): Promise<SingleStepExecuteResponse> => {
  const response = await fetchApi('/single-step/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
    errorLabel: msg('Zapytanie single-step nie powiodlo sie', 'single-step request failed'),
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return assertExecuteResponse(raw)
}

export const getSingleStepHistory = async (
  signal?: AbortSignal,
): Promise<SingleStepHistoryEntry[]> => {
  const response = await fetchApi('/single-step/history', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zapytanie o historie single-step nie powiodlo sie', 'single-step history request failed'),
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  if (!Array.isArray(raw)) {
    throw new Error(msg('Nieprawidlowy format odpowiedzi historii single-step', 'Invalid single-step history response format'))
  }
  return raw.map((entry) => toHistoryEntry(entry)).filter((entry): entry is SingleStepHistoryEntry => entry !== null)
}

export const getDispatchRunStatus = async (
  runId: string,
  signal?: AbortSignal,
): Promise<DispatchRunStatus> => {
  const response = await fetchApi(`/engine/runs/${encodeURIComponent(runId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zapytanie o status dispatch nie powiodlo sie', 'dispatch status request failed'),
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return assertRunStatus(raw)
}

export const waitForDispatchCompletion = async (
  runId: string,
  maxAttempts = 8,
  intervalMs = 500,
): Promise<DispatchRunStatus | null> => {
  let latest: DispatchRunStatus | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    latest = await getDispatchRunStatus(runId)
    if (TERMINAL_STATUSES.has(latest.status)) {
      return latest
    }
    await sleep(intervalMs)
  }
  return latest
}

export const createCollection = async (collectionName: string): Promise<CollectionSummary> => {
  const response = await fetchApi('/collection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ collectionName }),
    errorLabel: msg('Utworzenie kolekcji nie powiodlo sie', 'create collection failed'),
  })

  const raw = await readOptionalJson(response)
  return toCollectionSummary(raw) ?? { collectionName: collectionName.trim() }
}

export const getCollections = async (): Promise<CollectionSummary[]> => {
  const response = await fetchApi('/collection', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Pobranie listy kolekcji nie powiodlo sie', 'load collections failed'),
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.collections)
      ? raw.collections
      : []
  return list
    .map((entry) => toCollectionSummary(entry))
    .filter((entry): entry is CollectionSummary => entry !== null)
}

export const getCollectionByName = async (collectionName: string): Promise<{
  collection: CollectionSummary
  singleRequests: SingleRequestPayload[]
}> => {
  const response = await fetchApi(`/collection/${encodeURIComponent(collectionName)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Pobranie szczegolow kolekcji nie powiodlo sie', 'load collection details failed'),
  })

  const raw = await readOptionalJson(response)
  const collection = toCollectionSummary(raw) ?? { collectionName: collectionName.trim() }
  return {
    collection,
    singleRequests: readSingleRequestsArray(raw),
  }
}

export const deleteCollectionByName = async (collectionName: string): Promise<void> => {
  await fetchApi(`/collection/${encodeURIComponent(collectionName)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Usuniecie kolekcji nie powiodlo sie', 'delete collection failed'),
  })
}

export const createSingleRequest = async (payload: SingleRequestPayload): Promise<SingleRequestPayload> => {
  const response = await fetchApi('/single-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: msg('Utworzenie single-request nie powiodlo sie', 'create single-request failed'),
  })

  const raw = await readOptionalJson(response)
  return toSingleRequestPayload(raw) ?? payload
}

export const getSingleRequests = async (): Promise<SingleRequestPayload[]> => {
  const response = await fetchApi('/single-requests', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Pobranie listy single-request nie powiodlo sie', 'load single-requests failed'),
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return readSingleRequestsArray(raw)
}

export const getSingleRequestByName = async (singleRequestName: string): Promise<SingleRequestPayload | null> => {
  const response = await fetchApi(`/single-requests/${encodeURIComponent(singleRequestName)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Pobranie szczegolow single-request nie powiodlo sie', 'load single-request details failed'),
  })

  const raw = await readOptionalJson(response)
  return toSingleRequestPayload(raw)
}

export const patchSingleRequest = async (
  singleRequestName: string,
  payload: SingleRequestPayload,
): Promise<SingleRequestPayload> => {
  const response = await fetchApi(`/single-requests/${encodeURIComponent(singleRequestName)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: msg('Aktualizacja single-request nie powiodla sie', 'update single-request failed'),
  })

  const raw = await readOptionalJson(response)
  return toSingleRequestPayload(raw) ?? payload
}

export const deleteSingleRequestByName = async (singleRequestName: string): Promise<void> => {
  await fetchApi(`/single-requests/${encodeURIComponent(singleRequestName)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
    errorLabel: msg('Usuniecie single-request nie powiodlo sie', 'delete single-request failed'),
  })
}
