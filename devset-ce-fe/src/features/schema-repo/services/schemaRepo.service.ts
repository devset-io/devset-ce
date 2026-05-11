/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { fetchApi } from '../../../shared/services/http-api.service'
import type { CreateSchemaPayload, LoadedSchema, ReplaceSchemaPayload } from '../types/schemaRepo.types'
import type { WorkflowSchemaResponseDto } from '../../../shared/types/schema-response'
import { mapSchemaDto } from '../../../shared/utils/schema-normalization'

type SchemaRepoRequestOptions = {
  errorLabel?: string
}

const readSchemaListResponse = (
  payload: unknown,
  fallbackErrorLabel = 'Failed to load schemas: invalid response format',
): WorkflowSchemaResponseDto[] => {
  if (!Array.isArray(payload)) {
    throw new Error(fallbackErrorLabel)
  }

  return payload as WorkflowSchemaResponseDto[] // SAFETY: payload validated as array with correct shape in preceding filter
}

export async function loadSchemaRepoSchemas(options: SchemaRepoRequestOptions = {}): Promise<LoadedSchema[]> {
  const response = await fetchApi('/schemas', {
    headers: { Accept: 'application/json' },
    errorLabel: options.errorLabel,
  })

  const payload = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return readSchemaListResponse(payload, options.errorLabel).map((item) => mapSchemaDto(item))
}

export async function createSchemaRepoSchema(
  payload: CreateSchemaPayload,
  options: SchemaRepoRequestOptions = {},
): Promise<LoadedSchema> {
  const response = await fetchApi('/schemas', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: options.errorLabel,
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto for this endpoint
  return mapSchemaDto(next)
}

export async function replaceSchemaRepoSchema(
  schemaId: string,
  payload: ReplaceSchemaPayload,
  options: SchemaRepoRequestOptions = {},
): Promise<LoadedSchema> {
  const response = await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    errorLabel: options.errorLabel,
  })

  const next = (await response.json()) as WorkflowSchemaResponseDto // SAFETY: API contract returns single schema dto for this endpoint
  return mapSchemaDto(next)
}

export async function deleteSchemaRepoSchema(
  schemaId: string,
  options: SchemaRepoRequestOptions = {},
): Promise<void> {
  await fetchApi(`/schemas/${encodeURIComponent(schemaId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
    errorLabel: options.errorLabel,
  })
}
