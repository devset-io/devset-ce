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
import { HintInput } from '../../../../../shared/components/HintInput'
import { DispatchKafkaEnvelopeCard } from './DispatchKafkaEnvelopeCard'
import type {
  DispatchConnectorOptionViewModel,
  DispatchKafkaEnvelopeCardProps,
  DispatchRequestCardLabels,
} from '../../../types/messageDispatch.view.types'
import type { ContentMode } from '../../../types/messageDispatch.types'

interface DispatchConnectorConfigProps {
  labels: DispatchRequestCardLabels
  connectorOptions: DispatchConnectorOptionViewModel[]
  selectedConnectorName: string
  contentMode: ContentMode
  isLoadingConfig: boolean
  isSending: boolean
  topicRaw: string
  topicSuggestions: { value: string; label: string }[]
  routingKeyRaw: string
  exchangeRaw: string
  exchangeSuggestions: { value: string; label: string }[]
  kafkaEnvelopeCard: DispatchKafkaEnvelopeCardProps
  onConnectorChange: (name: string) => void
  onContentModeChange: (mode: ContentMode) => void
  onTopicChange: (value: string) => void
  onRoutingKeyChange: (value: string) => void
  onExchangeChange: (value: string) => void
}

export const DispatchConnectorConfig = React.memo(function DispatchConnectorConfig({
  labels,
  connectorOptions,
  selectedConnectorName,
  contentMode,
  isLoadingConfig,
  isSending,
  topicRaw,
  topicSuggestions,
  routingKeyRaw,
  exchangeRaw,
  exchangeSuggestions,
  kafkaEnvelopeCard,
  onConnectorChange,
  onContentModeChange,
  onTopicChange,
  onRoutingKeyChange,
  onExchangeChange,
}: DispatchConnectorConfigProps) {
  return (
    <div className="dispatch-grid">
      <label className="dispatch-label">
        {labels.connector}
        <select
          value={selectedConnectorName}
          onChange={(event) => onConnectorChange(event.target.value)}
          disabled={isLoadingConfig || isSending || connectorOptions.length === 0}
        >
          {connectorOptions.length > 0 ? (
            connectorOptions.map((connector) => (
              <option key={connector.name} value={connector.name}>
                {connector.name} ({connector.type.toUpperCase()})
              </option>
            ))
          ) : (
            <option value="">{labels.noConnectors}</option>
          )}
        </select>
      </label>

      <label className="dispatch-label">
        {labels.contentType}
        <select
          value={contentMode}
          onChange={(event) =>
            onContentModeChange(event.target.value === 'protobuf' ? 'protobuf' : 'json')
          }
          disabled={isSending}
        >
          <option value="json">JSON</option>
          <option value="protobuf">PROTOBUF</option>
        </select>
      </label>

      {kafkaEnvelopeCard.isVisible ? (
        <>
          <label className="dispatch-label">
            {labels.topic}
            <HintInput
              value={topicRaw}
              onChange={onTopicChange}
              items={topicSuggestions}
              placeholder="entity-events"
              disabled={isSending}
            />
          </label>

          <DispatchKafkaEnvelopeCard {...kafkaEnvelopeCard} />
        </>
      ) : (
        <div className="dispatch-rabbit-row">
          <label className="dispatch-label">
            {labels.queue}
            <HintInput
              value={topicRaw}
              onChange={onTopicChange}
              items={topicSuggestions}
              placeholder="entity-events-dev-1"
              disabled={isSending}
            />
          </label>

          <label className="dispatch-label">
            {labels.routingKey}
            <input
              value={routingKeyRaw}
              onChange={(event) => onRoutingKeyChange(event.target.value)}
              placeholder="entity.events.created"
              disabled={isSending}
            />
          </label>

          <label className="dispatch-label">
            {labels.exchange}
            <HintInput
              value={exchangeRaw}
              onChange={onExchangeChange}
              items={exchangeSuggestions}
              placeholder="events.exchange"
              disabled={isSending}
            />
          </label>
        </div>
      )}
    </div>
  )
})
