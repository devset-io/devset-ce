/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import {
  createSchema,
  deleteSchema,
  loadSchemas,
  replaceSchema,
} from '../../../shared/services/schemas-api.service'
import type { CreateSchemaPayload, LoadedSchema, ReplaceSchemaPayload } from '../types/schemaRepo.types'

type SchemaRepoRequestOptions = {
  errorLabel?: string
}

export async function loadSchemaRepoSchemas(options: SchemaRepoRequestOptions = {}): Promise<LoadedSchema[]> {
  return loadSchemas(options)
}

export async function createSchemaRepoSchema(
  payload: CreateSchemaPayload,
  options: SchemaRepoRequestOptions = {},
): Promise<LoadedSchema> {
  return createSchema(payload, options)
}

export async function replaceSchemaRepoSchema(
  schemaId: string,
  payload: ReplaceSchemaPayload,
  options: SchemaRepoRequestOptions = {},
): Promise<LoadedSchema> {
  return replaceSchema(schemaId, payload, options)
}

export async function deleteSchemaRepoSchema(
  schemaId: string,
  options: SchemaRepoRequestOptions = {},
): Promise<void> {
  return deleteSchema(schemaId, options)
}
