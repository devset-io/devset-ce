/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ConnectorStatus } from '../../../shared/services/kafka-connectors.service'
import type { KafkaMessage } from '../services/kafka-live.service'

export type KafkaLiveMode = 'live' | 'fetch'

export interface KafkaLiveState {
  connectors: ConnectorStatus[]
  selectedConnectorName: string | null
  topics: string[]
  selectedTopic: string | null
  messages: KafkaMessage[]
  selectedMessageKey: { partition: number; offset: number } | null
  mode: KafkaLiveMode
  searchQuery: string
  isLoadingConnectors: boolean
  isLoadingTopics: boolean
  isLoadingMessages: boolean
  isLoadingOlder: boolean
  hasMore: boolean
  error: string | null
  isJsonModalOpen: boolean
}

export type KafkaLiveAction =
  | { type: 'init' }
  | { type: 'connectorsLoaded'; connectors: ConnectorStatus[]; activeConnectorName: string | null }
  | { type: 'connectorsLoadFailed'; error: string }
  | { type: 'connectorSelected'; name: string }
  | { type: 'topicsLoaded'; topics: string[] }
  | { type: 'topicsLoadFailed'; error: string }
  | { type: 'topicSelected'; topic: string }
  | { type: 'messagesLoaded'; messages: KafkaMessage[] }
  | { type: 'messagesLoadFailed'; error: string }
  | { type: 'liveMessageReceived'; message: KafkaMessage }
  | { type: 'olderMessagesLoadFailed'; error: string }
  | { type: 'messageSelected'; partition: number; offset: number }
  | { type: 'setMode'; mode: KafkaLiveMode }
  | { type: 'searchChanged'; query: string }
  | { type: 'openJsonModal' }
  | { type: 'closeJsonModal' }
  | { type: 'fetchMessages' }
  | { type: 'fetchOlderMessages' }
  | { type: 'olderMessagesLoaded'; messages: KafkaMessage[] }

export interface KafkaLiveViewData {
  connectorOptions: { value: string; label: string }[]
  topicOptions: { value: string; label: string }[]
  filteredMessages: KafkaMessage[]
  selectedMessage: KafkaMessage | null
  hasSubscription: boolean
  messageCount: number
  formattedValue: string
  isValueJson: boolean
  hasMore: boolean
  isLoadingOlder: boolean
}
