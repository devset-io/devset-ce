/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { LoadedSchema } from '../../features/flow-builder/types'
import type { WorkflowSchemaResponseDto } from '../types/schema-response'
import { fetchApi } from './http-api.service'
import { mapSchemaDto } from '../utils/schema-normalization'
import { msg } from '../utils/i18n'

export type SchemaPayloadType = 'json' | 'protobuf'
export type SchemaPayload = Record<string, unknown> | string

export type CreateSchemaRequest = {
  id: string
  type: SchemaPayloadType
  schema: SchemaPayload
}

export type ReplaceSchemaRequest = {
  type: SchemaPayloadType
  schema: SchemaPayload
}

export type SchemasApiOptions = {
  errorLabel?: string
}

let schemaCache: LoadedSchema[] | null = null
let schemaInFlight: Promise<LoadedSchema[]> | null = null

const defaultErrorLabel = () => msg('Zadanie schematu nie powiodlo sie', 'Schema request failed')

/** Loads all schemas. Cached at module level; cache is invalidated by any mutation. */
export async function loadSchemas(options: SchemasApiOptions = {}): Promise<LoadedSchema[]> {
  if (schemaCache) {
    return schemaCache
  }
  if (schemaInFlight) {
    return schemaInFlight
  }

  schemaInFlight = (async () => {
    const response = await fetchApi('/schemas', {
      headers: { Accept: 'application/json' },
      errorLabel: options.errorLabel ?? defaultErrorLabel(),
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

/** Fetches a single schema by id. Does not use the list cache. */
export async function getSchema(schemaId: string, options: SchemasApiOptions = {}): Promise<LoadedSchema> {
  const response = await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    errorLabel: options.errorLabel ?? defaultErrorLabel(),
  })

  const payload = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string' || typeof payload.version !== 'number') {
    throw new Error(msg('Nie udalo sie zaladowac schematu: niepoprawny format odpowiedzi', 'Failed to load schema: invalid response format'))
  }
  return mapSchemaDto(payload)
}

/** Creates a schema. Invalidates the list cache. */
export async function createSchema(payload: CreateSchemaRequest, options: SchemasApiOptions = {}): Promise<LoadedSchema> {
  const response = await fetchApi('/schemas', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: options.errorLabel ?? defaultErrorLabel(),
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  clearSchemasCache()
  return mapSchemaDto(next)
}

/** Replaces a schema. Invalidates the list cache. */
export async function replaceSchema(
  schemaId: string,
  payload: ReplaceSchemaRequest,
  options: SchemasApiOptions = {},
): Promise<LoadedSchema> {
  const response = await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: options.errorLabel ?? defaultErrorLabel(),
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto
  clearSchemasCache()
  return mapSchemaDto(next)
}

/** Deletes a schema. Invalidates the list cache. */
export async function deleteSchema(schemaId: string, options: SchemasApiOptions = {}): Promise<void> {
  await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
    errorLabel: options.errorLabel ?? msg('Usuniecie schematu nie powiodlo sie', 'Delete schema failed'),
  })
  clearSchemasCache()
}

/** Manually clears the list cache. */
export function clearSchemasCache(): void {
  schemaCache = null
  schemaInFlight = null
}
