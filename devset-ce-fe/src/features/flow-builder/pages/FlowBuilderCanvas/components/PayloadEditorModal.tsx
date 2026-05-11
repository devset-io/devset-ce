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
import type { DslPayload } from '../../../types'
import { JsonCodeEditor } from '../../../components/JsonCodeEditor'
import { ModalShell } from '../../../components/ModalShell'
import { FB_UI } from '../../../ui/ui-classes'

type PayloadEditorModalProps = {
  isOpen: boolean
  payload: DslPayload
  payloadDraft: string
  isPayloadDraftDirty: boolean
  payloadDraftError: string | null
  onPayloadDraftChange: (value: string) => void
  onFormatPayloadDraft: () => void
  onResetPayloadDraft: () => void
  onClose: () => void
}

export const PayloadEditorModal = React.memo(function PayloadEditorModal({
  isOpen,
  payload,
  payloadDraft,
  isPayloadDraftDirty,
  payloadDraftError,
  onPayloadDraftChange,
  onFormatPayloadDraft,
  onResetPayloadDraft,
  onClose,
}: PayloadEditorModalProps) {
  const { t } = useI18n()
  return (
    <ModalShell
      isOpen={isOpen}
      title={t('flow.payloadModal.title')}
      subtitle={t('flow.payloadModal.subtitle')}
      onClose={onClose}
      zIndexClassName="z-[46]"
      containerClassName="max-h-[88vh] max-w-[980px] gap-2.5"
    >
      <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft)] p-2.5">
        <p className="m-0 mb-1 text-xs text-slate-700">
          <strong>{t('flow.payloadModal.id')}</strong> {payload.id}
        </p>
        <p className="m-0 mb-1 text-xs text-slate-700">
          <strong>{t('flow.payloadModal.topic')}</strong> {payload.topic}
        </p>
        <p className="m-0 text-xs text-slate-700">
          <strong>{t('flow.payloadModal.stages')}</strong> {payload.pipeline.length}
        </p>
      </div>

      <div className="mb-1 flex flex-wrap gap-2">
        <button type="button" className={`${FB_UI.secondaryButton} py-1.5 text-xs`} onClick={onFormatPayloadDraft}>
          {t('flow.payloadModal.format')}
        </button>
        <button type="button" className={`${FB_UI.secondaryButton} py-1.5 text-xs`} onClick={onResetPayloadDraft}>
          {t('flow.payloadModal.resetFromBuilder')}
        </button>
      </div>
      {isPayloadDraftDirty ? <p className="m-0 text-xs text-slate-500">{t('flow.payloadModal.dirty')}</p> : null}
      {payloadDraftError ? <p id="payload-error" className="m-0 text-xs text-red-700">{t('flow.payloadModal.jsonError', { error: payloadDraftError })}</p> : null}

      <JsonCodeEditor
        value={payloadDraft}
        onChange={onPayloadDraftChange}
        height="520px"
      />
    </ModalShell>
  )
})
