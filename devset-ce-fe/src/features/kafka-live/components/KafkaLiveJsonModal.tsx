/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback, useRef } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { CodeEditor } from '../../../shared/components/CodeEditor'
import { useDialogDismiss } from '../../../shared/hooks/useDialogDismiss'
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap'
import type { KafkaMessage } from '../services/kafka-live.service'

type KafkaLiveJsonModalProps = {
  isOpen: boolean
  message: KafkaMessage | null
  formattedValue: string
  isValueJson: boolean
  onClose: () => void
}

const NOOP = () => {}

/** Fullscreen modal for expanded payload view using CodeEditor. */
export const KafkaLiveJsonModal = React.memo(function KafkaLiveJsonModal({
  isOpen,
  message,
  formattedValue,
  isValueJson,
  onClose,
}: KafkaLiveJsonModalProps) {
  const { t } = useI18n()
  const modalRef = useRef<HTMLDivElement>(null)
  const isDialogVisible = isOpen && message != null
  useFocusTrap(modalRef, isDialogVisible)
  useDialogDismiss(modalRef, isDialogVisible, onClose, { closeOnOutsideClick: true })

  const handleCopy = useCallback(() => {
    if (!formattedValue) return
    void navigator.clipboard.writeText(formattedValue)
  }, [formattedValue])

  if (!isOpen || !message) return null

  return (
    <div className="klive-modal-scrim" role="dialog" aria-modal="true">
      <div className="klive-modal" ref={modalRef}>
        <div className="klive-modal-header">
          <div>
            <h3 className="klive-modal-title">{t('kafkaLive.modal.title')}</h3>
            <p className="klive-modal-subtitle">
              P{message.partition} · offset {message.offset} · {message.key ?? 'no key'}
            </p>
          </div>
          <div className="klive-modal-actions">
            <button type="button" className="klive-icon-btn" onClick={handleCopy} aria-label={t('kafkaLive.copy')}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16 19v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button type="button" className="klive-icon-btn" onClick={onClose} aria-label={t('kafkaLive.close')}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="klive-modal-body">
          <CodeEditor
            value={formattedValue}
            onChange={NOOP}
            language={isValueJson ? 'json' : 'plaintext'}
            readOnly
            height="65vh"
          />
        </div>
      </div>
    </div>
  )
})
