/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

export type SchemaPayloadType = 'json' | 'protobuf'

export type SchemaPayload = Record<string, unknown> | string

export type LoadedSchema = {
  id: string
  version: number
  event: string
  fileName: string
  schemaType: SchemaPayloadType | null
  schema: SchemaPayload
}

export type EditorMode = 'view' | 'edit' | 'create'

export type EditorSurface = 'json' | 'protobuf'

export type SchemaGroupKey = 'json' | 'protobuf'

export type SchemaRepoLabels = {
  schemaListTitle: string
  schemaLoading: string
  schemaLoadError: string
  viewerDefaultTitle: string
  protoNonEmpty: string
  jsonMustBeObject: string
  schemaIdRequired: string
  noSchemaForEdit: string
  saveFailed: string
  deleteFailed: string
  deleteConfirm: string
  groupEmpty: string
  actionsFor: string
  schemaActions: string
  deleting: string
  delete: string
  newSchema: string
  searchPlaceholder: string
  createTitle: string
  editorModeAria: string
  protobufBuilder: string
  edit: string
  cancel: string
  saving: string
  save: string
  schemaId: string
  schemaIdExample: string
  apiType: string
  protoEditorTitle: string
  protoEditorValidation: string
}

export type ReplaceSchemaPayload = {
  type: SchemaPayloadType
  schema: SchemaPayload
}

export type CreateSchemaPayload = {
  id: string
  type: SchemaPayloadType
  schema: SchemaPayload
}
