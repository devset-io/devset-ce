/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import type { KafkaLiveState, KafkaLiveViewData } from '../state/KafkaLive.types'

function safeJsonParse(raw: string): { parsed: unknown; ok: boolean } {
  try {
    return { parsed: JSON.parse(raw), ok: true }
  } catch {
    // Intentional: invalid JSON is expected for non-JSON payloads — handled via ok: false
    return { parsed: null, ok: false }
  }
}

/** Derives view-ready data from raw Kafka Live state. */
export function useKafkaLiveSelectors(state: KafkaLiveState): KafkaLiveViewData {
  const connectorOptions = useMemo(
    () =>
      state.connectors
        .filter((c) => c.type === 'kafka')
        .map((c) => ({ value: c.name, label: c.name })),
    [state.connectors],
  )

  const topicOptions = useMemo(
    () => state.topics.map((t) => ({ value: t, label: t })),
    [state.topics],
  )

  const filteredMessages = useMemo(() => {
    if (!state.searchQuery.trim()) return state.messages
    const q = state.searchQuery.toLowerCase()
    return state.messages.filter(
      (m) =>
        (m.key?.toLowerCase().includes(q) ?? false) ||
        m.value.toLowerCase().includes(q),
    )
  }, [state.messages, state.searchQuery])

  const selectedMessage = useMemo(
    () => {
      const key = state.selectedMessageKey
      if (!key) return null
      return state.messages.find((m) => m.partition === key.partition && m.offset === key.offset) ?? null
    },
    [state.messages, state.selectedMessageKey],
  )

  const { formattedValue, isValueJson } = useMemo(() => {
    if (!selectedMessage) return { formattedValue: '', isValueJson: false }
    const result = safeJsonParse(selectedMessage.value)
    if (result.ok) {
      return { formattedValue: JSON.stringify(result.parsed, null, 2), isValueJson: true }
    }
    return { formattedValue: selectedMessage.value, isValueJson: false }
  }, [selectedMessage])

  const hasSubscription = state.selectedConnectorName !== null && state.selectedTopic !== null

  return {
    connectorOptions,
    topicOptions,
    filteredMessages,
    selectedMessage,
    hasSubscription,
    messageCount: state.messages.length,
    formattedValue,
    isValueJson,
    hasMore: state.hasMore,
    isLoadingOlder: state.isLoadingOlder,
  }
}
