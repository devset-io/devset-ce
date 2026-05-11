/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { EditorMode, EditorSurface, LoadedSchema, SchemaGroupKey } from '../../../types/schemaRepo.types'

export interface SchemaRepoState {
  schemas: LoadedSchema[]
  selectedSchemaId: string
  editorMode: EditorMode
  schemaIdDraft: string
  schemaJsonDraft: string
  schemaProtoDraft: string
  editorSurface: EditorSurface
  schemaSearch: string
  isLoading: boolean
  isSaving: boolean
  isDeletingSchemaId: string | null
  openMenuKey: string | null
  isGroupExpanded: Record<SchemaGroupKey, boolean>
  error: string | null
}

export type SchemaRepoAction =
  | { type: 'init' }
  | { type: 'loadSuccess'; schemas: LoadedSchema[] }
  | { type: 'loadFailed'; error: string }
  | { type: 'startCreate' }
  | { type: 'startEdit' }
  | { type: 'cancelEdit' }
  | { type: 'saveSchema' }
  | { type: 'saveSucceeded' }
  | { type: 'saveFailed' }
  | { type: 'selectSchema'; schemaId: string }
  | { type: 'deleteSchema'; schemaId: string }
  | { type: 'deleteSucceeded' }
  | { type: 'deleteFailed' }
  | { type: 'toggleGroup'; groupKey: SchemaGroupKey }
  | { type: 'toggleMenu'; menuKey: string }
  | { type: 'setSchemaSearch'; value: string }
  | { type: 'setSchemaIdDraft'; value: string }
  | { type: 'setSchemaJsonDraft'; value: string }
  | { type: 'setSchemaProtoDraft'; value: string }
  | { type: 'setEditorSurface'; value: EditorSurface }
  | { type: 'schemasRefreshed'; schemas: LoadedSchema[]; selectedSchemaId: string }
  | { type: 'closeMenu' }
