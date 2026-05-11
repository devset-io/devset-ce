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
import { useI18n } from '../../../../core/i18n/I18nProvider'
import { SchemaRepo } from './components/SchemaRepo'
import { useSchemaRepo } from './hooks/SchemaRepo.hooks'
import type { SchemaRepoLabels } from '../../types/schemaRepo.types'

export function SchemaRepoContainer() {
  const { t } = useI18n()

  const labels = useMemo<SchemaRepoLabels>(
    () => ({
      schemaListTitle: t('schema.title.list'),
      schemaLoading: t('schema.loading'),
      schemaLoadError: t('schema.error.load'),
      viewerDefaultTitle: t('schema.viewer.defaultTitle'),
      protoNonEmpty: t('schema.view.protoNonEmpty'),
      jsonMustBeObject: t('schema.view.jsonMustBeObject'),
      schemaIdRequired: t('schema.view.schemaIdRequired'),
      noSchemaForEdit: t('schema.view.noSchemaForEdit'),
      saveFailed: t('schema.view.saveFailed'),
      deleteFailed: t('schema.view.deleteFailed'),
      deleteConfirm: t('schema.view.deleteConfirm'),
      groupEmpty: t('schema.view.groupEmpty'),
      actionsFor: t('schema.view.actionsFor'),
      schemaActions: t('schema.view.schemaActions'),
      deleting: t('schema.view.deleting'),
      delete: t('schema.view.delete'),
      newSchema: t('schema.view.newSchema'),
      searchPlaceholder: t('schema.view.searchPlaceholder'),
      createTitle: t('schema.view.createTitle'),
      editorModeAria: t('schema.view.editorModeAria'),
      protobufBuilder: t('schema.view.protobufBuilder'),
      edit: t('schema.view.edit'),
      cancel: t('schema.view.cancel'),
      saving: t('schema.view.saving'),
      save: t('schema.view.save'),
      schemaId: t('schema.view.schemaId'),
      schemaIdExample: t('schema.view.schemaIdExample'),
      apiType: t('schema.view.apiType'),
      protoEditorTitle: t('proto.editor.title'),
      protoEditorValidation: t('proto.editor.validation'),
    }),
    [t],
  )

  const vm = useSchemaRepo({ labels })

  // Keep browser-only confirmation in the container so the UI stays declarative.
  const handleDeleteSchema = (schemaId: string) => {
    const confirmed = window.confirm(labels.deleteConfirm.replace('{id}', schemaId))
    if (!confirmed) {
      return
    }

    void vm.deleteSchema(schemaId)
  }

  return (
    <SchemaRepo
      labels={labels}
      groups={vm.groups}
      editor={vm.editor}
      schemaSearch={vm.schemaSearch}
      schemaIdDraft={vm.schemaIdDraft}
      schemaJsonDraft={vm.schemaJsonDraft}
      schemaProtoDraft={vm.schemaProtoDraft}
      isLoading={vm.isLoading}
      isBusy={vm.isBusy}
      error={vm.error}
      onStartCreate={vm.startCreate}
      onStartEdit={vm.startEdit}
      onCancelEdit={vm.cancelEdit}
      onSave={vm.saveSchema}
      onSelectSchema={vm.selectSchema}
      onDeleteSchema={handleDeleteSchema}
      onToggleGroup={vm.toggleGroup}
      onToggleMenu={vm.toggleMenu}
      onSchemaSearchChange={vm.setSchemaSearch}
      onSchemaIdDraftChange={vm.setSchemaIdDraft}
      onSchemaJsonDraftChange={vm.setSchemaJsonDraft}
      onSchemaProtoDraftChange={vm.setSchemaProtoDraft}
      onEditorSurfaceChange={vm.setEditorSurface}
    />
  )
}
