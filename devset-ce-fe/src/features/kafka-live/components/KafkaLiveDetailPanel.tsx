/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { CodeEditor } from '../../../shared/components/CodeEditor'
import type { KafkaMessage } from '../services/kafka-live.service'

type KafkaLiveDetailPanelProps = {
  message: KafkaMessage | null
  formattedValue: string
  isValueJson: boolean
  onOpenFullscreen: () => void
}

const NOOP = () => {}

/** Right panel showing metadata and readonly code editor for payload. */
export const KafkaLiveDetailPanel = React.memo(function KafkaLiveDetailPanel({
  message,
  formattedValue,
  isValueJson,
  onOpenFullscreen,
}: KafkaLiveDetailPanelProps) {
  const { t } = useI18n()

  const handleCopy = useCallback(() => {
    if (!formattedValue) return
    void navigator.clipboard.writeText(formattedValue)
  }, [formattedValue])

  if (!message) {
    return (
      <div className="klive-detail klive-detail-empty">
        <p>{t('kafkaLive.detail.selectMessage')}</p>
      </div>
    )
  }

  const headerEntries = Object.entries(message.headers)

  return (
    <div className="klive-detail">
      <div className="klive-detail-meta">
        <div className="klive-detail-meta-row">
          <span className="klive-detail-label">{t('kafkaLive.detail.partition')}</span>
          <span className="klive-detail-value mono">{message.partition}</span>
        </div>
        <div className="klive-detail-meta-row">
          <span className="klive-detail-label">{t('kafkaLive.detail.offset')}</span>
          <span className="klive-detail-value mono">{message.offset}</span>
        </div>
        <div className="klive-detail-meta-row">
          <span className="klive-detail-label">{t('kafkaLive.detail.timestamp')}</span>
          <span className="klive-detail-value mono">{message.timestamp}</span>
        </div>
        <div className="klive-detail-meta-row">
          <span className="klive-detail-label">{t('kafkaLive.detail.key')}</span>
          <span className="klive-detail-value mono">{message.key ?? '—'}</span>
        </div>
        {headerEntries.length > 0 && (
          <div className="klive-detail-meta-row klive-detail-headers">
            <span className="klive-detail-label">{t('kafkaLive.detail.headers')}</span>
            <div className="klive-detail-value">
              {headerEntries.map(([k, v]) => (
                <span key={k} className="klive-header-pill mono">{k}: {v}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="klive-detail-payload">
        <div className="klive-detail-payload-bar">
          <span className="klive-detail-label">{t('kafkaLive.detail.payload')}</span>
          <div className="klive-detail-payload-actions">
            <button type="button" className="klive-icon-btn" onClick={handleCopy} aria-label={t('kafkaLive.copy')}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16 19v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button type="button" className="klive-icon-btn" onClick={onOpenFullscreen} aria-label={t('kafkaLive.expand')}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="klive-detail-payload-body">
          <CodeEditor
            value={formattedValue}
            onChange={NOOP}
            language={isValueJson ? 'json' : 'plaintext'}
            readOnly
            height="calc(100vh - 380px)"
          />
        </div>
      </div>
    </div>
  )
})
