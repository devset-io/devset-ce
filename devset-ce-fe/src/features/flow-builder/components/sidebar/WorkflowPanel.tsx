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
import { useI18n } from '../../../../core/i18n/I18nProvider'
import { FB_UI } from '../../ui/ui-classes'

type WorkflowPanelProps = {
  workflowId: string
  onWorkflowIdChange: (value: string) => void
  workflowStateFields: number
  onOpenWorkflowStateEditor: () => void
  onOpenPayloadEditor: () => void
  onOpenPlayground: () => void
  isSchemaLoading: boolean
  schemasCount: number
  schemaError: string | null
  payloadDraftError: string | null
  hasUnsavedChanges: boolean
  isSaving: boolean
  onSave: () => void
}

export const WorkflowPanel = React.memo(function WorkflowPanel({
  workflowId,
  onWorkflowIdChange,
  workflowStateFields,
  onOpenWorkflowStateEditor,
  onOpenPayloadEditor,
  onOpenPlayground,
  isSchemaLoading,
  schemasCount,
  schemaError,
  payloadDraftError,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: WorkflowPanelProps) {
  const { t } = useI18n()
  const schemasStatus = isSchemaLoading
    ? t('flow.workflow.schemasLoading')
    : t('flow.workflow.schemasLoaded', { count: schemasCount })
  return (
    <section
      className={`${FB_UI.card} shrink-0 flex flex-col gap-2 ${
        hasUnsavedChanges ? 'border-amber-300' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold text-slate-800">{t('flow.workflow.title')}</h3>
        <button
          type="button"
          className={`${FB_UI.primaryButton} px-3 py-1.5 text-xs`}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? t('flow.workflow.saving') : t('flow.workflow.save')}
        </button>
      </header>
      <label className={FB_UI.label}>
        {t('flow.workflow.id')}
        <input className={FB_UI.input} value={workflowId} onChange={(event) => onWorkflowIdChange(event.target.value)} />
      </label>
      {hasUnsavedChanges ? (
        <p className="m-0 text-xs font-semibold text-amber-700">{t('flow.workflow.unsaved')}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onOpenWorkflowStateEditor} className={`${FB_UI.primaryButton} w-full`}>
          {workflowStateFields > 0
            ? t('flow.workflow.editState', { count: workflowStateFields })
            : t('flow.workflow.addState')}
        </button>
        <button type="button" onClick={onOpenPayloadEditor} className={`${FB_UI.secondaryButton} w-full`}>
          {t('flow.workflow.showPayload')}
        </button>
        <button type="button" onClick={onOpenPlayground} className={`${FB_UI.secondaryButton} w-full`}>
          {t('flow.workflow.openPlayground')}
        </button>
      </div>
      <p className={FB_UI.hint}>{t('flow.workflow.payloadHint')}</p>
      <p className={FB_UI.hint}>{t('flow.workflow.schemas', { status: schemasStatus })}</p>
      {schemaError ? <p className="text-xs text-red-700">{schemaError}</p> : null}
      {payloadDraftError ? (
        <p className="text-xs text-red-700">{t('flow.workflow.payloadJsonError', { error: payloadDraftError })}</p>
      ) : null}
    </section>
  )
})
