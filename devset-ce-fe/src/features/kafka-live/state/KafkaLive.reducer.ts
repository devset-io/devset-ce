/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { KafkaLiveAction, KafkaLiveState } from './KafkaLive.types'

const MESSAGE_BUFFER_LIMIT = 1000
const FETCH_PAGE_SIZE = 50

export function createInitialState(): KafkaLiveState {
  return {
    connectors: [],
    selectedConnectorName: null,
    topics: [],
    selectedTopic: null,
    messages: [],
    selectedMessageKey: null,
    mode: 'fetch',
    searchQuery: '',
    isLoadingConnectors: false,
    isLoadingTopics: false,
    isLoadingMessages: false,
    isLoadingOlder: false,
    hasMore: true,
    error: null,
    isJsonModalOpen: false,
  }
}

export function reducer(state: KafkaLiveState, action: KafkaLiveAction): KafkaLiveState {
  switch (action.type) {
    case 'init':
      return { ...state, isLoadingConnectors: true, error: null }

    case 'connectorsLoaded': {
      const kafkaConnectors = action.connectors.filter((c) => c.type === 'kafka')
      const candidate = kafkaConnectors.find((c) => c.name === action.activeConnectorName)?.name
        ?? kafkaConnectors[0]?.name
        ?? null
      return {
        ...state,
        isLoadingConnectors: false,
        connectors: action.connectors,
        selectedConnectorName: candidate,
      }
    }

    case 'connectorsLoadFailed':
      return { ...state, isLoadingConnectors: false, error: action.error }

    case 'connectorSelected':
      return {
        ...state,
        selectedConnectorName: action.name,
        topics: [],
        selectedTopic: null,
        messages: [],
        selectedMessageKey: null,
        isLoadingTopics: true,
        error: null,
      }

    case 'topicsLoaded':
      return { ...state, isLoadingTopics: false, topics: action.topics }

    case 'topicsLoadFailed':
      return { ...state, isLoadingTopics: false, error: action.error }

    case 'topicSelected':
      return {
        ...state,
        selectedTopic: action.topic,
        messages: [],
        selectedMessageKey: null,
        isLoadingMessages: true,
        hasMore: true,
        error: null,
      }

    case 'messagesLoaded': {
      const merged = mergeMessages(state.messages, action.messages)
      return { ...state, isLoadingMessages: false, messages: merged, hasMore: action.messages.length >= FETCH_PAGE_SIZE }
    }

    case 'messagesLoadFailed':
      return { ...state, isLoadingMessages: false, isLoadingOlder: false, error: action.error }

    case 'liveMessageReceived': {
      const merged = mergeMessages(state.messages, [action.message])
      return { ...state, messages: merged }
    }

    case 'olderMessagesLoadFailed':
      return { ...state, isLoadingOlder: false, error: action.error }

    case 'messageSelected':
      return { ...state, selectedMessageKey: { partition: action.partition, offset: action.offset }, isJsonModalOpen: false }

    case 'setMode':
      return {
        ...state,
        mode: action.mode,
        messages: [],
        selectedMessageKey: null,
        isLoadingMessages: action.mode === 'fetch',
        isJsonModalOpen: false,
      }

    case 'searchChanged':
      return { ...state, searchQuery: action.query }

    case 'openJsonModal':
      return { ...state, isJsonModalOpen: true }

    case 'closeJsonModal':
      return { ...state, isJsonModalOpen: false }

    case 'fetchMessages':
      return { ...state, messages: [], selectedMessageKey: null, isLoadingMessages: true, isJsonModalOpen: false, hasMore: true }

    case 'fetchOlderMessages':
      return { ...state, isLoadingOlder: true }

    case 'olderMessagesLoaded': {
      const existingKeys = new Set(state.messages.map((m) => `${m.partition}:${m.offset}`))
      const unique = action.messages.filter((m) => !existingKeys.has(`${m.partition}:${m.offset}`))
      const appended = [...state.messages, ...unique].slice(0, MESSAGE_BUFFER_LIMIT)
      return { ...state, isLoadingOlder: false, messages: appended, hasMore: action.messages.length >= FETCH_PAGE_SIZE }
    }

    default:
      return state
  }
}

function mergeMessages(
  existing: KafkaLiveState['messages'],
  incoming: KafkaLiveState['messages'],
): KafkaLiveState['messages'] {
  if (existing.length === 0) return incoming.slice(0, MESSAGE_BUFFER_LIMIT)

  const existingKeys = new Set(existing.map((m) => `${m.partition}:${m.offset}`))
  const newMessages = incoming.filter((m) => !existingKeys.has(`${m.partition}:${m.offset}`))

  if (newMessages.length === 0) return existing

  const merged = [...newMessages, ...existing]
  return merged.slice(0, MESSAGE_BUFFER_LIMIT)
}
