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

/** Normalizes various schema type fields into a canonical payload type. */
export const normalizeSchemaType = (value: unknown): LoadedSchema['schemaType'] =>
  value === 'json' || value === 'protobuf' ? value : null

const readStringField = (value: unknown, field: string): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = (value as Record<string, unknown>)[field] // SAFETY: value is confirmed as non-null object by guard above
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null
}

const normalizeSchemaPayload = (schemaType: LoadedSchema['schemaType'], value: unknown): LoadedSchema['schema'] => {
  if (schemaType === 'protobuf') {
    if (typeof value === 'string') {
      return value
    }

    // Backend moze zwracac dodatkowe pola (np. descriptor). FE uzywa tylko surowej definicji .proto.
    return (
      readStringField(value, 'proto') ??
      readStringField(value, 'schema') ??
      readStringField(value, 'definition') ??
      readStringField(value, 'content') ??
      ''
    )
  }

  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown> // SAFETY: value validated as non-null object in preceding checks
  }

  return {}
}

/** Maps a schema DTO from the API into the internal schema model. */
export const mapSchemaDto = (item: WorkflowSchemaResponseDto): LoadedSchema => {
  const schemaType = normalizeSchemaType(item.type ?? item.schemaType ?? item.format ?? item.kind)
  return {
    id: item.id,
    version: item.version,
    event: item.id,
    fileName: `v${item.version}`,
    schemaType,
    schema: normalizeSchemaPayload(schemaType, item.schema),
  }
}
