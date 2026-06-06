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
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { BuilderNode } from '../../flow-builder/types.ts'
import { FB_UI } from '../../flow-builder/ui/ui-classes.ts'
import { getNodeLabel } from '../utils/function-studio-draft.ts'

type FunctionStudioHeaderProps = {
  selectedNode: BuilderNode | null
  hasPendingChanges: boolean
  isSavingDraft: boolean
  isSaveBlocked: boolean
  onReset: () => void
  onSave: () => void
  onClose: () => void
}

export const FunctionStudioHeader = React.memo(function FunctionStudioHeader({
  selectedNode,
  hasPendingChanges,
  isSavingDraft,
  isSaveBlocked,
  onReset,
  onSave,
  onClose,
}: FunctionStudioHeaderProps) {
  const { t } = useI18n()
  const saveDisabled = isSavingDraft || isSaveBlocked
  return (
    <header className="flex items-start justify-between gap-3 border-b border-[var(--brand-border)] bg-[var(--brand-soft)]/70 p-4">
      <div>
        <h3 id="function-studio-dialog-title" className="m-0 text-base font-semibold text-slate-800">{t('flow.fnStudio.title')}</h3>
        <p className="mt-1 text-xs text-slate-600">{getNodeLabel(selectedNode, t)}</p>
      </div>
      <div className="flex items-center gap-2">
        {hasPendingChanges ? (
          <>
            <button type="button" className={FB_UI.secondaryButton} onClick={onReset} disabled={isSavingDraft}>
              {t('flow.fnStudioHeader.reset')}
            </button>
            <button
              type="button"
              data-testid="fn-studio-save"
              className={FB_UI.primaryButton}
              onClick={onSave}
              disabled={saveDisabled}
              title={isSaveBlocked ? t('flow.fnStudioHeader.saveBlockedDslError') : undefined}
              aria-describedby={isSaveBlocked ? 'fn-studio-save-blocked' : undefined}
            >
              {isSavingDraft ? t('flow.fnStudioHeader.saving') : t('flow.fnStudioHeader.save')}
            </button>
            {isSaveBlocked ? (
              <span id="fn-studio-save-blocked" className="sr-only">
                {t('flow.fnStudioHeader.saveBlockedDslError')}
              </span>
            ) : null}
          </>
        ) : null}
        <button type="button" className={FB_UI.secondaryButton} onClick={onClose}>
          {t('flow.fnStudioHeader.close')}
        </button>
      </div>
    </header>
  )
})
