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
import type { KafkaMessage } from '../services/kafka-live.service'

type MessageKey = { partition: number; offset: number }

type KafkaLiveMessageStreamProps = {
  messages: KafkaMessage[]
  selectedKey: MessageKey | null
  isLoading: boolean
  hasMore: boolean
  isLoadingOlder: boolean
  isLiveMode: boolean
  onSelectMessage: (key: MessageKey) => void
  onLoadMore: () => void
}

function formatTime(timestamp: string): string {
  return timestamp.replace('T', ' ').slice(11, 23)
}

function formatOffset(offset: number): string {
  return offset.toLocaleString('en-US')
}

function formatSize(value: string): string {
  const bytes = new Blob([value]).size
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function truncateValue(value: string, maxLen = 80): string {
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value
}

/** Scrollable message list with 6-column grid layout and pagination. */
export const KafkaLiveMessageStream = React.memo(function KafkaLiveMessageStream({
  messages,
  selectedKey,
  isLoading,
  hasMore,
  isLoadingOlder,
  isLiveMode,
  onSelectMessage,
  onLoadMore,
}: KafkaLiveMessageStreamProps) {
  const { t } = useI18n()

  const handleRowClick = useCallback(
    (key: MessageKey) => onSelectMessage(key),
    [onSelectMessage],
  )

  if (isLoading && messages.length === 0) {
    return (
      <div className="klive-stream-loading">
        <span className="klive-status-label">{t('kafkaLive.loading')}</span>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="klive-stream-loading">
        <span className="klive-status-label">{t('kafkaLive.noMessages')}</span>
      </div>
    )
  }

  return (
    <div className="klive-stream">
      <div className="klive-stream-header">
        <span>{t('kafkaLive.col.time')}</span>
        <span>{t('kafkaLive.col.partition')}</span>
        <span>{t('kafkaLive.col.offset')}</span>
        <span>{t('kafkaLive.col.key')}</span>
        <span>{t('kafkaLive.col.value')}</span>
        <span>{t('kafkaLive.col.size')}</span>
      </div>
      <div className="klive-stream-body">
        {messages.map((msg) => (
          <button
            key={`${msg.partition}:${msg.offset}`}
            type="button"
            className={`klive-msg-row ${selectedKey?.partition === msg.partition && selectedKey?.offset === msg.offset ? 'selected' : ''}`}
            onClick={() => handleRowClick({ partition: msg.partition, offset: msg.offset })}
          >
            <span className="klive-msg-time">{formatTime(msg.timestamp)}</span>
            <span className="klive-msg-partition">
              <span className="klive-partition-pill">
                <span className="klive-partition-dot" />
                P{msg.partition}
              </span>
            </span>
            <span className="klive-msg-offset">{formatOffset(msg.offset)}</span>
            <span className={`klive-msg-key ${msg.key ? '' : 'empty'}`}>{msg.key ?? '—'}</span>
            <span className="klive-msg-value">{truncateValue(msg.value)}</span>
            <span className="klive-msg-size">{formatSize(msg.value)}</span>
          </button>
        ))}
        {!isLiveMode && hasMore && (
          <div className="klive-load-more">
            <button
              type="button"
              className="klive-load-more-btn"
              disabled={isLoadingOlder}
              onClick={onLoadMore}
            >
              {isLoadingOlder ? t('kafkaLive.loadingOlder') : t('kafkaLive.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
