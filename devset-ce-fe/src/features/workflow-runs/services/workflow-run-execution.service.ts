/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DslPayload } from '../../flow-builder/types'
import type {
  ExecutionPlanEvent,
  ExecutionPlanRunEventsResponse,
} from '../../../shared/types/execution-plan-events'
import {
  normalizeExecutionPlanRunEventsResponse,
  normalizeExecutionPlanStatus,
} from '../../../shared/services/execution-plan-events.service'
import { fetchApi } from '../../../shared/services/http-api.service'

export type WorkflowRunExecuteResponse = {
  runId: string
  status: string
  executions?: number
}

export type WorkflowRunEvent = ExecutionPlanEvent

export type WorkflowRunStatusResponse = {
  runId: string
  workflowId: string | null
  workflowName: string | null
  status: 'PENDING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'COMPLETED' | 'FAILED'
  active: boolean
  requestedExecutions: number
  submittedExecutions: number
  completedExecutions: number
  failedExecutions: number
  errorMessage: string | null
}

export type WorkflowRunsResponse = {
  active: WorkflowRunStatusResponse[]
  completed: WorkflowRunStatusResponse[]
}

export type RunEventsResponse = ExecutionPlanRunEventsResponse

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'STOPPED'])

import { msg } from '../../../shared/utils/i18n'

const assertExecuteResponse = (payload: unknown): WorkflowRunExecuteResponse => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(msg('Niepoprawny format odpowiedzi execute', 'Invalid execute response format'))
  }
  const candidate = payload as Partial<WorkflowRunExecuteResponse> // SAFETY: payload confirmed as non-null object; Partial allows safe field validation below
  if (!candidate.runId || typeof candidate.runId !== 'string') {
    throw new Error(msg('Niepoprawna odpowiedz execute: brak runId', 'Invalid execute response: missing runId'))
  }
  if (!candidate.status || typeof candidate.status !== 'string') {
    throw new Error(msg('Niepoprawna odpowiedz execute: brak statusu', 'Invalid execute response: missing status'))
  }
  return {
    runId: candidate.runId,
    status: candidate.status,
    executions: typeof candidate.executions === 'number' ? candidate.executions : undefined,
  }
}

const normalizeRunStatus = (payload: unknown): WorkflowRunStatusResponse => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(msg('Niepoprawny format odpowiedzi statusu runa', 'Invalid run status response format'))
  }
  const candidate = payload as Partial<WorkflowRunStatusResponse> // SAFETY: payload confirmed as non-null object; Partial allows safe field validation below
  if (!candidate.runId || typeof candidate.runId !== 'string') {
    throw new Error(msg('Niepoprawna odpowiedz statusu runa: brak runId', 'Invalid run status response: missing runId'))
  }
  if (!candidate.status || typeof candidate.status !== 'string') {
    throw new Error(msg('Niepoprawna odpowiedz statusu runa: brak statusu', 'Invalid run status response: missing status'))
  }

  const normalizedStatus = normalizeExecutionPlanStatus(candidate.status)

  return {
    runId: candidate.runId,
    workflowId: typeof (candidate as { workflowId?: unknown }).workflowId === 'string' // SAFETY: accessing optional properties on confirmed object for field-by-field validation
      ? (candidate as { workflowId: string }).workflowId // SAFETY: accessing optional properties on confirmed object for field-by-field validation
      : typeof (candidate as { workflowName?: unknown }).workflowName === 'string' // SAFETY: accessing optional properties on confirmed object for field-by-field validation
        ? (candidate as { workflowName: string }).workflowName // SAFETY: accessing optional properties on confirmed object for field-by-field validation
        : null,
    workflowName: typeof (candidate as { workflowName?: unknown }).workflowName === 'string' // SAFETY: accessing optional properties on confirmed object for field-by-field validation
      ? (candidate as { workflowName: string }).workflowName // SAFETY: accessing optional properties on confirmed object for field-by-field validation
      : null,
    status: normalizedStatus,
    active:
      typeof (candidate as { active?: unknown }).active === 'boolean' // SAFETY: accessing optional properties on confirmed object for field-by-field validation
        ? Boolean((candidate as { active: boolean }).active) // SAFETY: accessing optional properties on confirmed object for field-by-field validation
        : normalizedStatus === 'PENDING' || normalizedStatus === 'RUNNING' || normalizedStatus === 'STOPPING',
    requestedExecutions: typeof candidate.requestedExecutions === 'number' ? candidate.requestedExecutions : 0,
    submittedExecutions: typeof candidate.submittedExecutions === 'number' ? candidate.submittedExecutions : 0,
    completedExecutions: typeof candidate.completedExecutions === 'number' ? candidate.completedExecutions : 0,
    failedExecutions: typeof candidate.failedExecutions === 'number' ? candidate.failedExecutions : 0,
    errorMessage: typeof candidate.errorMessage === 'string' ? candidate.errorMessage : null,
  }
}

const normalizeRunEvents = (payload: unknown, runId: string): RunEventsResponse => {
  return normalizeExecutionPlanRunEventsResponse(payload, runId)
}

const sleep = async (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException(msg('Polling przerwany', 'Polling aborted'), 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })

export const executeWorkflowDsl = async (
  payload: DslPayload,
  signal: AbortSignal,
): Promise<WorkflowRunExecuteResponse> => {
  const normalizedPayload: DslPayload = {
    ...payload,
    pipeline: payload.pipeline.map((stage) => {
      // Query-only stages don't use schemas
      if (stage.query) return stage
      const normalizedSchemaId =
        typeof stage.schemaId === 'string' && stage.schemaId.trim().length > 0
          ? stage.schemaId.trim()
          : (stage.event ?? '').trim()
      return {
        ...stage,
        ...(normalizedSchemaId ? { schemaId: normalizedSchemaId } : {}),
      }
    }),
  }

  const response = await fetchApi('/engine/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(normalizedPayload),
    signal,
    errorLabel: msg('Zadanie runa nie powiodlo sie', 'Run request failed'),
  })

  const json = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return assertExecuteResponse(json)
}

export const getWorkflowRunStatus = async (
  runId: string,
  signal: AbortSignal,
): Promise<WorkflowRunStatusResponse> => {
  const response = await fetchApi(`/engine/runs/${encodeURIComponent(runId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zadanie runa nie powiodlo sie', 'Run request failed'),
  })

  const json = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return normalizeRunStatus(json)
}

export const listWorkflowRuns = async (signal: AbortSignal): Promise<WorkflowRunsResponse> => {
  const response = await fetchApi('/engine/runs', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zadanie runa nie powiodlo sie', 'Run request failed'),
  })

  const json = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  if (!json || typeof json !== 'object') {
    throw new Error(msg('Niepoprawny format odpowiedzi listy runow', 'Invalid runs list response format'))
  }
  const candidate = json as Partial<WorkflowRunsResponse> // SAFETY: json is unknown; Partial allows safe field validation below
  if (!Array.isArray(candidate.active) || !Array.isArray(candidate.completed)) {
    throw new Error(msg('Niepoprawny format odpowiedzi listy runow', 'Invalid runs list response format'))
  }
  return {
    active: candidate.active.map((item) => normalizeRunStatus(item)),
    completed: candidate.completed.map((item) => normalizeRunStatus(item)),
  }
}

export const stopWorkflowRun = async (
  runId: string,
  signal: AbortSignal,
): Promise<WorkflowRunStatusResponse> => {
  const response = await fetchApi(`/engine/runs/${encodeURIComponent(runId)}/stop`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zadanie runa nie powiodlo sie', 'Run request failed'),
  })

  const json = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return normalizeRunStatus(json)
}

export const getWorkflowRunEvents = async (
  runId: string,
  signal: AbortSignal,
): Promise<RunEventsResponse> => {
  const response = await fetchApi(`/engine/runs/${encodeURIComponent(runId)}/events`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    errorLabel: msg('Zadanie runa nie powiodlo sie', 'Run request failed'),
  })

  const json = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return normalizeRunEvents(json, runId)
}

export const pollWorkflowRunStatus = async (
  runId: string,
  signal: AbortSignal,
  onUpdate: (status: WorkflowRunStatusResponse) => void,
  intervalMs = 1200,
): Promise<WorkflowRunStatusResponse> => {
  while (true) {
    const status = await getWorkflowRunStatus(runId, signal)
    onUpdate(status)

    if (TERMINAL_STATUSES.has(status.status.toUpperCase())) {
      return status
    }

    await sleep(intervalMs, signal)
  }
}
