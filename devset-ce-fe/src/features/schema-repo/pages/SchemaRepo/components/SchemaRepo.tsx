/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import { SchemaRepoEditor } from './SchemaRepoEditor'
import { SchemaRepoSidebar } from './SchemaRepoSidebar'
import type { SchemaRepoProps } from '../../../types/schemaRepo.view.types'

export const SchemaRepo = React.memo(function SchemaRepo(props: SchemaRepoProps) {
  const {
    labels,
    groups,
    editor,
    schemaSearch,
    schemaIdDraft,
    schemaJsonDraft,
    schemaProtoDraft,
    isLoading,
    isBusy,
    error,
    onStartCreate,
    onStartEdit,
    onCancelEdit,
    onSave,
    onSelectSchema,
    onDeleteSchema,
    onToggleGroup,
    onToggleMenu,
    onSchemaSearchChange,
    onSchemaIdDraftChange,
    onSchemaJsonDraftChange,
    onSchemaProtoDraftChange,
    onEditorSurfaceChange,
  } = props

  return (
    <div className="schema-repo">
      <SchemaRepoSidebar
        labels={labels}
        groups={groups}
        schemaSearch={schemaSearch}
        isLoading={isLoading}
        isBusy={isBusy}
        error={error}
        onStartCreate={onStartCreate}
        onSelectSchema={onSelectSchema}
        onDeleteSchema={onDeleteSchema}
        onToggleGroup={onToggleGroup}
        onToggleMenu={onToggleMenu}
        onSchemaSearchChange={onSchemaSearchChange}
      />

      <SchemaRepoEditor
        labels={labels}
        editor={editor}
        schemaIdDraft={schemaIdDraft}
        schemaJsonDraft={schemaJsonDraft}
        schemaProtoDraft={schemaProtoDraft}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSave}
        onSchemaIdDraftChange={onSchemaIdDraftChange}
        onSchemaJsonDraftChange={onSchemaJsonDraftChange}
        onSchemaProtoDraftChange={onSchemaProtoDraftChange}
        onEditorSurfaceChange={onEditorSurfaceChange}
      />
    </div>
  )
})
