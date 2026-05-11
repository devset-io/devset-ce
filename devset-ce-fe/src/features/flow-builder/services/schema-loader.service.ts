/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { LoadedSchema } from '../types'
import { fetchApi } from '../../../shared/services/http-api.service'
import { msg } from '../../../shared/utils/i18n'
import type { WorkflowSchemaResponseDto } from '../../../shared/types/schema-response'
import { mapSchemaDto } from '../../../shared/utils/schema-normalization'

type ReplaceWorkflowSchemaRequest = {
  type?: 'json' | 'protobuf'
  schema: Record<string, unknown> | string
}

type CreateWorkflowSchemaRequest = {
  id: string
  type?: 'json' | 'protobuf'
  schema: Record<string, unknown> | string
}

let schemaCache: LoadedSchema[] | null = null
let schemaInFlight: Promise<LoadedSchema[]> | null = null

export async function loadWorkflowSchemas(): Promise<LoadedSchema[]> {
  if (schemaCache) {
    return schemaCache
  }
  if (schemaInFlight) {
    return schemaInFlight
  }

  schemaInFlight = (async () => {
    const response = await fetchApi('/schemas', {
      headers: { Accept: 'application/json' },
      errorLabel: msg('Zadanie schematu nie powiodlo sie', 'Schema request failed'),
    })

    const payload = (await response.json()) as WorkflowSchemaResponseDto[] // SAFETY: API contract returns schema array for this endpoint
    if (!Array.isArray(payload)) {
      throw new Error(msg('Nie udalo sie zaladowac schematow: niepoprawny format odpowiedzi', 'Failed to load schemas: invalid response format'))
    }

    const mapped = payload.map((item) => mapSchemaDto(item))

    schemaCache = mapped
    return mapped
  })()

  try {
    return await schemaInFlight
  } finally {
    schemaInFlight = null
  }
}

export async function getWorkflowSchema(schemaId: string): Promise<LoadedSchema> {
  const response = await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    errorLabel: msg('Zadanie schematu nie powiodlo sie', 'Schema request failed'),
  })

  const payload = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string' || typeof payload.version !== 'number') {
    throw new Error(msg('Nie udalo sie zaladowac schematu: niepoprawny format odpowiedzi', 'Failed to load schema: invalid response format'))
  }
  return mapSchemaDto(payload)
}

export async function replaceWorkflowSchema(
  schemaId: string,
  payload: ReplaceWorkflowSchemaRequest,
): Promise<LoadedSchema> {
  const response = await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: msg('Zadanie schematu nie powiodlo sie', 'Schema request failed'),
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  clearWorkflowSchemasCache()
  return mapSchemaDto(next)
}

export async function createWorkflowSchema(payload: CreateWorkflowSchemaRequest): Promise<LoadedSchema> {
  const response = await fetchApi('/schemas', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: msg('Zadanie schematu nie powiodlo sie', 'Schema request failed'),
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  clearWorkflowSchemasCache()
  return mapSchemaDto(next)
}

export async function deleteWorkflowSchema(schemaId: string): Promise<void> {
  await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
    errorLabel: msg('Usuniecie schematu nie powiodlo sie', 'Delete schema failed'),
  })

  clearWorkflowSchemasCache()
}

export function clearWorkflowSchemasCache() {
  schemaCache = null
  schemaInFlight = null
}
