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
import { ModalShell } from '../../../components/ModalShell'
import { FB_UI } from '../../../ui/ui-classes'

type DeleteStageModalProps = {
  isOpen: boolean
  stageName: string
  onCancel: () => void
  onConfirm: () => void
}

export const DeleteStageModal = React.memo(function DeleteStageModal({ isOpen, stageName, onCancel, onConfirm }: DeleteStageModalProps) {
  const { t } = useI18n()
  return (
    <ModalShell
      isOpen={isOpen}
      title={t('flow.deleteStageModal.title')}
      subtitle={t('flow.deleteStageModal.subtitle', { stage: stageName || '?' })}
      onClose={onCancel}
      zIndexClassName="z-[53]"
      containerClassName="max-w-[500px] gap-3"
    >
      <footer className="flex items-center justify-end gap-2">
        <button type="button" className={FB_UI.secondaryButton} onClick={onCancel}>
          {t('flow.common.cancel')}
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
          onClick={onConfirm}
        >
          {t('flow.inspector.delete')}
        </button>
      </footer>
    </ModalShell>
  )
})
