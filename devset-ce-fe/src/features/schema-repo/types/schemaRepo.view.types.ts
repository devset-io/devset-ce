/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { EditorMode, EditorSurface, SchemaGroupKey, SchemaRepoLabels } from './schemaRepo.types'

export type SchemaRepoGroupItemViewModel = {
  id: string
  version: number
  menuKey: string
  isSelected: boolean
  isMenuOpen: boolean
  isDeleting: boolean
}

export type SchemaRepoGroupViewModel = {
  key: SchemaGroupKey
  title: string
  isExpanded: boolean
  items: SchemaRepoGroupItemViewModel[]
}

export type SchemaRepoEditorViewModel = {
  title: string
  mode: EditorMode
  surface: EditorSurface
  surfaceLabel: string
  schemaTypeValue: SchemaGroupKey
  canEdit: boolean
  canSwitchSurface: boolean
  isReadOnly: boolean
  isSaving: boolean
}

export type SchemaRepoProps = {
  labels: SchemaRepoLabels
  groups: SchemaRepoGroupViewModel[]
  editor: SchemaRepoEditorViewModel
  schemaSearch: string
  schemaIdDraft: string
  schemaJsonDraft: string
  schemaProtoDraft: string
  isLoading: boolean
  isBusy: boolean
  error: string | null
  onStartCreate: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => Promise<void>
  onSelectSchema: (schemaId: string) => void
  onDeleteSchema: (schemaId: string) => void | Promise<void>
  onToggleGroup: (groupKey: SchemaGroupKey) => void
  onToggleMenu: (menuKey: string) => void
  onSchemaSearchChange: (value: string) => void
  onSchemaIdDraftChange: (value: string) => void
  onSchemaJsonDraftChange: (value: string) => void
  onSchemaProtoDraftChange: (value: string) => void
  onEditorSurfaceChange: (surface: EditorSurface) => void
}

export type SchemaRepoSidebarProps = Pick<
  SchemaRepoProps,
  | 'labels'
  | 'groups'
  | 'schemaSearch'
  | 'isLoading'
  | 'isBusy'
  | 'error'
  | 'onStartCreate'
  | 'onSelectSchema'
  | 'onDeleteSchema'
  | 'onToggleGroup'
  | 'onToggleMenu'
  | 'onSchemaSearchChange'
>

export type SchemaRepoGroupProps = Pick<
  SchemaRepoProps,
  'labels' | 'isBusy' | 'onSelectSchema' | 'onDeleteSchema' | 'onToggleGroup' | 'onToggleMenu'
> & {
  group: SchemaRepoGroupViewModel
}

export type SchemaRepoEditorProps = Pick<
  SchemaRepoProps,
  | 'labels'
  | 'schemaIdDraft'
  | 'schemaJsonDraft'
  | 'schemaProtoDraft'
  | 'onStartEdit'
  | 'onCancelEdit'
  | 'onSave'
  | 'onSchemaIdDraftChange'
  | 'onSchemaJsonDraftChange'
  | 'onSchemaProtoDraftChange'
  | 'onEditorSurfaceChange'
> & {
  editor: SchemaRepoEditorViewModel
}
