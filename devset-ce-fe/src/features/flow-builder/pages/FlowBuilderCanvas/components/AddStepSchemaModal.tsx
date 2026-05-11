/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useState } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import type { LoadedSchema } from '../../../types'
import { ModalShell } from '../../../components/ModalShell'
import { FB_UI } from '../../../ui/ui-classes'

type AddStepSchemaModalProps = {
  isOpen: boolean
  schemas: LoadedSchema[]
  onClose: () => void
  onConfirm: (schemaEvent: string) => void
}

export const AddStepSchemaModal = React.memo(function AddStepSchemaModal({ isOpen, schemas, onClose, onConfirm }: AddStepSchemaModalProps) {
  const { t } = useI18n()
  const [selectedEvent, setSelectedEvent] = useState('')
  const hasSchemas = schemas.length > 0
  const defaultEvent = schemas[0]?.event ?? ''
  const effectiveSelectedEvent = schemas.some((schema) => schema.event === selectedEvent) ? selectedEvent : defaultEvent

  const resetSelectionAndClose = () => {
    setSelectedEvent(defaultEvent)
    onClose()
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title={t('flow.addStageModal.title')}
      subtitle={t('flow.addStageModal.subtitle')}
      onClose={resetSelectionAndClose}
      zIndexClassName="z-[47]"
      containerClassName="max-w-[640px] gap-3"
    >
      {hasSchemas ? (
        <>
          <label className={FB_UI.label}>
            {t('flow.addStageModal.schemaRepo')}
            <select
              className={FB_UI.input}
              value={effectiveSelectedEvent}
              onChange={(event) => setSelectedEvent(event.target.value)}
            >
              {schemas.map((schema) => (
                <option key={schema.event} value={schema.event}>
                  {schema.event} ({schema.fileName})
                </option>
              ))}
            </select>
          </label>
          <p className={`${FB_UI.hint} m-0`}>{t('flow.addStageModal.hint')}</p>
        </>
      ) : (
        <p className="m-0 text-sm text-red-700">{t('flow.addStageModal.noSchemas')}</p>
      )}

      <footer className="flex items-center justify-end gap-2">
        <button type="button" className={FB_UI.secondaryButton} onClick={resetSelectionAndClose}>
          {t('flow.common.cancel')}
        </button>
        <button
          type="button"
          className={FB_UI.primaryButton}
          disabled={!hasSchemas || !effectiveSelectedEvent}
          onClick={() => {
            onConfirm(effectiveSelectedEvent)
            setSelectedEvent(defaultEvent)
          }}
        >
          {t('flow.addStageModal.add')}
        </button>
      </footer>
    </ModalShell>
  )
})
