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
import { ModalShell } from '../../flow-builder/components/ModalShell.tsx'
import { FB_UI } from '../../flow-builder/ui/ui-classes.ts'

type FunctionStudioDiscardModalProps = {
  isOpen: boolean
  onCancel: () => void
  onDiscard: () => void
}

export const FunctionStudioDiscardModal = React.memo(function FunctionStudioDiscardModal({ isOpen, onCancel, onDiscard }: FunctionStudioDiscardModalProps) {
  const { t } = useI18n()
  return (
    <ModalShell
      isOpen={isOpen}
      title={t('flow.fnStudioDiscard.title')}
      subtitle={t('flow.fnStudioDiscard.subtitle')}
      onClose={onCancel}
      zIndexClassName="z-[52]"
      containerClassName="max-w-[480px] gap-3"
    >
      <footer className="flex items-center justify-end gap-2">
        <button type="button" className={FB_UI.secondaryButton} onClick={onCancel}>
          {t('flow.fnStudioDiscard.back')}
        </button>
        <button type="button" className={FB_UI.primaryButton} onClick={onDiscard}>
          {t('flow.fnStudioDiscard.closeWithoutSave')}
        </button>
      </footer>
    </ModalShell>
  )
})
