/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DslPayload, ExistingWorkflowOption } from '../types'
import { fetchApi } from '../../../shared/services/http-api.service'
import { msg } from '../../../shared/utils/i18n'

export const loadExistingWorkflows = async (signal?: AbortSignal): Promise<ExistingWorkflowOption[]> => {
  const response = await fetchApi('/workflows', {
    headers: { Accept: 'application/json' },
    signal,
  })

  const payload = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  if (!Array.isArray(payload)) {
    throw new Error(msg('Niepoprawny format odpowiedzi workflow', 'Invalid workflow response format'))
  }

  return payload
    .map((item): ExistingWorkflowOption | null => {
      if (typeof item === 'string' && item.trim()) {
        return { id: item, label: item }
      }
      if (!item || typeof item !== 'object') {
        return null
      }
      const id = (item as { id?: unknown }).id // SAFETY: accessing optional property after Array.isArray check on payload
      if (typeof id !== 'string' || !id.trim()) {
        return null
      }
      const label = (item as { name?: unknown }).name // SAFETY: accessing optional property after Array.isArray check on payload
      return {
        id,
        label: typeof label === 'string' && label.trim() ? label : id,
      }
    })
    .filter((item): item is ExistingWorkflowOption => item !== null)
}

export const loadWorkflowById = async (id: string): Promise<DslPayload> => {
  const safeId = encodeURIComponent(id)
  const response = await fetchApi(`/workflows/${safeId}`, {
    headers: { Accept: 'application/json' },
  })

  const payload = (await response.json()) as Partial<DslPayload> // SAFETY: API contract returns DSL payload shape; Partial allows safe access
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.pipeline)) {
    throw new Error(msg('Niepoprawny format payloadu workflow', 'Invalid workflow payload format'))
  }
  if (!payload.id || typeof payload.id !== 'string') {
    throw new Error(msg('Niepoprawny payload workflow: brak id', 'Invalid workflow payload: missing id'))
  }
  if (payload.pipeline.length === 0) {
    throw new Error(msg('Niepoprawny payload workflow: pipeline nie moze byc puste', 'Invalid workflow payload: pipeline cannot be empty'))
  }

  return {
    ...payload,
    executions: typeof payload.executions === 'number' && payload.executions > 0 ? payload.executions : 1,
    state: payload.state && typeof payload.state === 'object' && !Array.isArray(payload.state) ? payload.state : {},
  } as DslPayload // SAFETY: object literal constructed with all required DslPayload fields from validated partial
}

export const createWorkflow = async (payload: DslPayload): Promise<DslPayload> => {
  const response = await fetchApi('/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return (await response.json()) as DslPayload // SAFETY: API contract returns full DSL payload for save response
}

export const updateWorkflow = async (id: string, payload: DslPayload): Promise<DslPayload> => {
  const response = await fetchApi(`/workflows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return (await response.json()) as DslPayload // SAFETY: API contract returns full DSL payload for import response
}

export const deleteWorkflow = async (id: string): Promise<void> => {
  await fetchApi(`/workflows/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
