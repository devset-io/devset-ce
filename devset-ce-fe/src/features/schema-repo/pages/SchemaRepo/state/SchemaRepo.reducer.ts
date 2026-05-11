/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { EditorSurface, LoadedSchema } from '../../../types/schemaRepo.types'
import type { SchemaRepoAction, SchemaRepoState } from './SchemaRepo.types'

const NEW_JSON_SCHEMA_TEMPLATE = JSON.stringify(
  {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Nowe zdarzenie',
    type: 'object',
    properties: {},
  },
  null,
  2,
)

const NEW_PROTO_TEMPLATE = `syntax = "proto3";

package app.v1;

message SampleEvent {
  string id = 1;
  string value = 2;
  bool is_active = 3;
}
`

type DraftFields = {
  schemaIdDraft: string
  schemaJsonDraft: string
  schemaProtoDraft: string
  editorSurface: EditorSurface
}

function createDefaultDraftState(): DraftFields {
  return {
    schemaIdDraft: '',
    schemaJsonDraft: NEW_JSON_SCHEMA_TEMPLATE,
    schemaProtoDraft: NEW_PROTO_TEMPLATE,
    editorSurface: 'json',
  }
}

function buildDefaultProtoTemplate(schemaId: string): string {
  const normalized = schemaId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('')

  const messageName = normalized || 'SampleEvent'
  return `syntax = "proto3";

package app.v1;

message ${messageName} {
  string id = 1;
  string value = 2;
  bool is_active = 3;
}
`
}

function normalizeSchemaPayloadForDraft(schema: LoadedSchema): Pick<DraftFields, 'schemaJsonDraft' | 'schemaProtoDraft' | 'editorSurface'> {
  if (typeof schema.schema === 'string') {
    return {
      schemaJsonDraft: NEW_JSON_SCHEMA_TEMPLATE,
      schemaProtoDraft: schema.schema,
      editorSurface: 'protobuf',
    }
  }

  return {
    schemaJsonDraft: JSON.stringify(schema.schema, null, 2),
    schemaProtoDraft: buildDefaultProtoTemplate(schema.id),
    editorSurface: schema.schemaType === 'protobuf' ? 'protobuf' : 'json',
  }
}

function hydrateDraftFromSchema(state: SchemaRepoState, schema: LoadedSchema | null): SchemaRepoState {
  if (!schema) {
    const defaults = createDefaultDraftState()
    return { ...state, ...defaults }
  }

  const draftState = normalizeSchemaPayloadForDraft(schema)
  return {
    ...state,
    schemaIdDraft: schema.id,
    schemaJsonDraft: draftState.schemaJsonDraft,
    schemaProtoDraft: draftState.schemaProtoDraft,
    editorSurface: draftState.editorSurface,
  }
}

function findSelectedSchema(state: SchemaRepoState): LoadedSchema | null {
  return state.schemas.find((item) => item.id === state.selectedSchemaId) ?? null
}

export function reducer(state: SchemaRepoState, action: SchemaRepoAction): SchemaRepoState {
  switch (action.type) {
    case 'init':
      return { ...state, isLoading: true, error: null }

    case 'loadSuccess':
      return { ...state, schemas: action.schemas, isLoading: false, error: null }

    case 'loadFailed':
      return { ...state, isLoading: false, error: action.error }

    case 'startCreate': {
      const defaults = createDefaultDraftState()
      return { ...state, error: null, editorMode: 'create', ...defaults }
    }

    case 'startEdit': {
      const selected = findSelectedSchema(state)
      if (!selected) return state
      const next = hydrateDraftFromSchema({ ...state, error: null, editorMode: 'edit' }, selected)
      return next
    }

    case 'cancelEdit': {
      const selected = findSelectedSchema(state)
      const next = hydrateDraftFromSchema({ ...state, error: null, editorMode: 'view' }, selected)
      return next
    }

    case 'saveSchema':
      return { ...state, isSaving: true, error: null }

    case 'saveSucceeded':
      return { ...state, isSaving: false, editorMode: 'view' }

    case 'saveFailed':
      return { ...state, isSaving: false }

    case 'selectSchema': {
      const nextState: SchemaRepoState = { ...state, error: null, selectedSchemaId: action.schemaId, editorMode: 'view' }
      const selected = nextState.schemas.find((item) => item.id === action.schemaId) ?? null
      return hydrateDraftFromSchema(nextState, selected)
    }

    case 'deleteSchema':
      return { ...state, error: null, openMenuKey: null, isDeletingSchemaId: action.schemaId }

    case 'deleteSucceeded':
      return { ...state, isDeletingSchemaId: null }

    case 'deleteFailed':
      return { ...state, isDeletingSchemaId: null }

    case 'toggleGroup':
      return {
        ...state,
        isGroupExpanded: {
          ...state.isGroupExpanded,
          [action.groupKey]: !state.isGroupExpanded[action.groupKey],
        },
      }

    case 'toggleMenu':
      return { ...state, openMenuKey: state.openMenuKey === action.menuKey ? null : action.menuKey }

    case 'closeMenu':
      return { ...state, openMenuKey: null }

    case 'setSchemaSearch':
      return { ...state, schemaSearch: action.value }

    case 'setSchemaIdDraft':
      return { ...state, schemaIdDraft: action.value }

    case 'setSchemaJsonDraft':
      return { ...state, schemaJsonDraft: action.value }

    case 'setSchemaProtoDraft':
      return { ...state, schemaProtoDraft: action.value }

    case 'setEditorSurface':
      return { ...state, editorSurface: action.value }

    case 'schemasRefreshed': {
      const nextState: SchemaRepoState = {
        ...state,
        schemas: action.schemas,
        selectedSchemaId: action.selectedSchemaId,
        isLoading: false,
      }
      const selected = nextState.schemas.find((item) => item.id === action.selectedSchemaId) ?? null
      if (nextState.editorMode !== 'create') {
        return hydrateDraftFromSchema(nextState, selected)
      }
      return nextState
    }

    default:
      return state
  }
}

export function createInitialState(): SchemaRepoState {
  return {
    schemas: [],
    selectedSchemaId: '',
    editorMode: 'view',
    schemaIdDraft: '',
    schemaJsonDraft: NEW_JSON_SCHEMA_TEMPLATE,
    schemaProtoDraft: NEW_PROTO_TEMPLATE,
    editorSurface: 'json',
    schemaSearch: '',
    isLoading: true,
    isSaving: false,
    isDeletingSchemaId: null,
    openMenuKey: null,
    isGroupExpanded: { json: true, protobuf: true },
    error: null,
  }
}
