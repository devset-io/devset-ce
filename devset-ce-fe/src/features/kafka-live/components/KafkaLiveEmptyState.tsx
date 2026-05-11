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

type KafkaLiveEmptyStateProps = {
  connectorOptions: { value: string; label: string }[]
  selectedConnectorName: string | null
  topicOptions: { value: string; label: string }[]
  isLoadingTopics: boolean
  onConnectorChange: (name: string) => void
  onTopicSelect: (topic: string) => void
}

/** Hero card prompting the user to select a connector and topic. */
export const KafkaLiveEmptyState = React.memo(function KafkaLiveEmptyState({
  connectorOptions,
  selectedConnectorName,
  topicOptions,
  isLoadingTopics,
  onConnectorChange,
  onTopicSelect,
}: KafkaLiveEmptyStateProps) {
  const { t } = useI18n()

  return (
    <div className="klive-empty">
      <div className="klive-empty-card">
        <div className="klive-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </div>
        <h3 className="klive-empty-title">{t('kafkaLive.empty.title')}</h3>
        <p className="klive-empty-subtitle">{t('kafkaLive.empty.subtitle')}</p>

        <div className="klive-empty-form">
          <label className="klive-empty-label">
            {t('kafkaLive.connector')}
            <select
              className="klive-combo"
              value={selectedConnectorName ?? ''}
              onChange={(e) => onConnectorChange(e.target.value)}
            >
              <option value="" disabled>
                {t('kafkaLive.selectConnector')}
              </option>
              {connectorOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="klive-empty-label">
            {t('kafkaLive.topic')}
            <select
              className="klive-combo"
              value=""
              disabled={!selectedConnectorName || isLoadingTopics || topicOptions.length === 0}
              onChange={(e) => onTopicSelect(e.target.value)}
            >
              <option value="" disabled>
                {isLoadingTopics ? t('kafkaLive.loadingTopics') : t('kafkaLive.selectTopic')}
              </option>
              {topicOptions.map((tp) => (
                <option key={tp.value} value={tp.value}>
                  {tp.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
})
