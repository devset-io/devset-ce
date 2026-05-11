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
import { useI18n } from '../../../core/i18n/I18nProvider'
import type { KafkaLiveMode, KafkaLiveViewData } from '../state/KafkaLive.types'

type KafkaLiveScopeBarProps = {
  selectedConnectorName: string | null
  selectedTopic: string | null
  mode: KafkaLiveMode
  searchQuery: string
  messageCount: number
  isLoadingMessages: boolean
  connectorOptions: KafkaLiveViewData['connectorOptions']
  topicOptions: KafkaLiveViewData['topicOptions']
  onConnectorChange: (name: string) => void
  onTopicChange: (topic: string) => void
  onSearchChange: (query: string) => void
  onSetMode: (mode: KafkaLiveMode) => void
  onFetch: () => void
}

/** Toolbar with connector/topic selectors, mode toggle, search, and fetch button. */
export const KafkaLiveScopeBar = React.memo(function KafkaLiveScopeBar({
  selectedConnectorName,
  selectedTopic,
  mode,
  searchQuery,
  messageCount,
  isLoadingMessages,
  connectorOptions,
  topicOptions,
  onConnectorChange,
  onTopicChange,
  onSearchChange,
  onSetMode,
  onFetch,
}: KafkaLiveScopeBarProps) {
  const { t } = useI18n()

  const isLive = mode === 'live'

  return (
    <div className="klive-scope-bar">
      <div className="klive-scope-status">
        <span className={`klive-pulse-dot ${isLive ? '' : 'paused'}`} />
        <span className={`klive-status-label ${isLive ? '' : 'paused'}`}>
          {isLive ? t('kafkaLive.live') : t('kafkaLive.fetch')}
        </span>
      </div>

      <div className="klive-mode-toggle">
        <button
          type="button"
          className={`klive-mode-btn ${isLive ? 'active' : ''}`}
          onClick={() => onSetMode('live')}
        >
          {t('kafkaLive.live')}
        </button>
        <button
          type="button"
          className={`klive-mode-btn ${!isLive ? 'active' : ''}`}
          onClick={() => onSetMode('fetch')}
        >
          {t('kafkaLive.fetch')}
        </button>
      </div>

      <span className="klive-scope-sep" />

      <select className="klive-combo" value={selectedConnectorName ?? ''} onChange={(e) => onConnectorChange(e.target.value)}>
        <option value="" disabled>{t('kafkaLive.selectConnector')}</option>
        {connectorOptions.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <span className="klive-crumb-sep" aria-hidden="true">›</span>

      <select
        className="klive-combo"
        value={selectedTopic ?? ''}
        onChange={(e) => onTopicChange(e.target.value)}
        disabled={topicOptions.length === 0}
      >
        <option value="" disabled>{t('kafkaLive.selectTopic')}</option>
        {topicOptions.map((tp) => (
          <option key={tp.value} value={tp.value}>{tp.label}</option>
        ))}
      </select>

      <span className="klive-scope-stats">
        {messageCount} {t('kafkaLive.messages')}
      </span>

      <div className="klive-scope-right">
        <div className="klive-search-wrap">
          <svg className="klive-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="klive-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('kafkaLive.searchPlaceholder')}
          />
        </div>

        {!isLive && (
          <button
            type="button"
            className="klive-fetch-btn"
            disabled={isLoadingMessages}
            onClick={onFetch}
          >
            {isLoadingMessages ? t('kafkaLive.fetching') : t('kafkaLive.fetchNow')}
          </button>
        )}
      </div>
    </div>
  )
})
