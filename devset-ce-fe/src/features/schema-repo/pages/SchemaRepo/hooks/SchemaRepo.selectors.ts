/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import type { LoadedSchema, SchemaRepoLabels } from '../../../types/schemaRepo.types'
import type { SchemaRepoEditorViewModel, SchemaRepoGroupViewModel } from '../../../types/schemaRepo.view.types'
import type { SchemaRepoState } from '../state/SchemaRepo.types'

type SchemaRepoSelectors = {
  selectedSchema: LoadedSchema | null
  groups: SchemaRepoGroupViewModel[]
  editor: SchemaRepoEditorViewModel
}

export function useSchemaRepoSelectors(
  state: SchemaRepoState,
  deferredSchemaSearch: string,
  labels: SchemaRepoLabels,
): SchemaRepoSelectors {
  const selectedSchema = useMemo(
    () => state.schemas.find((item) => item.id === state.selectedSchemaId) ?? null,
    [state.schemas, state.selectedSchemaId],
  )

  const filteredSchemas = useMemo(() => {
    const query = deferredSchemaSearch.trim().toLowerCase()
    if (!query) {
      return state.schemas
    }

    return state.schemas.filter((item) => item.id.toLowerCase().includes(query) || item.event.toLowerCase().includes(query))
  }, [deferredSchemaSearch, state.schemas])

  const groups = useMemo<SchemaRepoGroupViewModel[]>(
    () => [
      {
        key: 'json',
        title: 'JSON',
        isExpanded: state.isGroupExpanded.json,
        items: filteredSchemas
          .filter((item) => item.schemaType === 'json')
          .map((item) => ({
            id: item.id,
            version: item.version,
            menuKey: `schema:json:${item.id}`,
            isSelected: item.id === state.selectedSchemaId,
            isMenuOpen: state.openMenuKey === `schema:json:${item.id}`,
            isDeleting: state.isDeletingSchemaId === item.id,
          })),
      },
      {
        key: 'protobuf',
        title: 'PROTOBUF',
        isExpanded: state.isGroupExpanded.protobuf,
        items: filteredSchemas
          .filter((item) => item.schemaType === 'protobuf')
          .map((item) => ({
            id: item.id,
            version: item.version,
            menuKey: `schema:protobuf:${item.id}`,
            isSelected: item.id === state.selectedSchemaId,
            isMenuOpen: state.openMenuKey === `schema:protobuf:${item.id}`,
            isDeleting: state.isDeletingSchemaId === item.id,
          })),
      },
    ],
    [filteredSchemas, state.isDeletingSchemaId, state.isGroupExpanded, state.openMenuKey, state.selectedSchemaId],
  )

  const editor = useMemo<SchemaRepoEditorViewModel>(
    () => ({
      title: state.editorMode === 'create' ? labels.createTitle : selectedSchema?.id ?? labels.viewerDefaultTitle,
      mode: state.editorMode,
      surface: state.editorSurface,
      surfaceLabel: state.editorSurface === 'protobuf' ? labels.protobufBuilder : 'JSON',
      schemaTypeValue: state.editorSurface === 'protobuf' ? 'protobuf' : 'json',
      canEdit: state.editorMode === 'view' && selectedSchema !== null,
      canSwitchSurface: state.editorMode === 'create',
      isReadOnly: state.editorMode === 'view',
      isSaving: state.isSaving,
    }),
    [state.editorMode, state.editorSurface, state.isSaving, labels.createTitle, labels.protobufBuilder, labels.viewerDefaultTitle, selectedSchema],
  )

  return { selectedSchema, groups, editor }
}
