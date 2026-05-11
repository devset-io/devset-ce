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
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { ModalShell } from '../../../../flow-builder/components/ModalShell'
import { FB_UI } from '../../../../flow-builder/ui/ui-classes'
import type { SettingsAction } from '../state/Settings.types'

interface SettingsOverwriteModalProps {
  isOpen: boolean
  normalizedDraftName: string
  isSubmitting: boolean
  onAction: (action: SettingsAction) => void
}

/** Overwrite confirmation modal. */
export const SettingsOverwriteModal = React.memo(function SettingsOverwriteModal({
  isOpen,
  normalizedDraftName,
  isSubmitting,
  onAction,
}: SettingsOverwriteModalProps) {
  const { t } = useI18n()

  return (
    <ModalShell
      isOpen={isOpen}
      title={t('settings.confirm.overwriteTitle')}
      subtitle={t('settings.confirm.overwriteSubtitle').replace('{name}', normalizedDraftName)}
      onClose={() => onAction({ type: 'closeOverwriteConfirm' })}
      zIndexClassName="z-[54]"
      containerClassName="max-w-[520px] gap-3"
    >
      <div className="settings-modal-copy">
        <p className="settings-modal-lead">{t('settings.confirm.overwriteBody')}</p>
      </div>
      <footer className="flex items-center justify-end gap-2">
        <button
          type="button"
          className={FB_UI.secondaryButton}
          onClick={() => onAction({ type: 'closeOverwriteConfirm' })}
          disabled={isSubmitting}
        >
          {t('flow.common.cancel')}
        </button>
        <button
          type="button"
          className={FB_UI.primaryButton}
          onClick={() => onAction({ type: 'confirmOverwrite' })}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('settings.action.savingChanges') : t('settings.action.confirmOverwrite')}
        </button>
      </footer>
    </ModalShell>
  )
})
