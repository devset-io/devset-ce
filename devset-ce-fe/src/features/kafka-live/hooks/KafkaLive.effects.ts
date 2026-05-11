/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { loadConnectorsState } from '../../../shared/services/kafka-connectors.service'
import { fetchTopicsForConnector } from '../../../shared/services/kafka-connectors.service'
import { fetchMessages, buildTopicStreamWsUrl, wsEventToMessage, isKafkaMessage } from '../services/kafka-live.service'
import type { KafkaLiveAction, KafkaLiveState } from '../state/KafkaLive.types'

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function parseWsFrame(raw: string): Record<string, unknown> | null {
  const data = JSON.parse(raw) as unknown
  if (typeof data !== 'object' || data === null) return null
  return data as Record<string, unknown>
}

const WS_RECONNECT_DELAY_MS = 3000

/** Handles side effects for the Kafka Live feature. */
export function useKafkaLiveEffects(
  state: KafkaLiveState,
  dispatch: (action: KafkaLiveAction) => void,
  lastActionRef: RefObject<KafkaLiveAction | null>,
) {
  const abortRef = useRef<AbortController | null>(null)

  // --- Action-driven effects ---
  useEffect(() => {
    if (!lastActionRef.current) return
    const action = lastActionRef.current
    lastActionRef.current = null

    if (action.type === 'init') {
      void loadConnectorsAndTopics()
    }

    if (action.type === 'connectorSelected') {
      abortInflight()
      void loadTopicsFor(action.name)
    }

    if (
      action.type === 'topicSelected' ||
      action.type === 'fetchMessages' ||
      (action.type === 'setMode' && action.mode === 'fetch')
    ) {
      abortInflight()
      void loadMessages()
    }

    if (action.type === 'fetchOlderMessages') {
      void loadOlderMessages()
    }

    function abortInflight() {
      abortRef.current?.abort()
      abortRef.current = null
    }

    async function loadConnectorsAndTopics(): Promise<void> {
      try {
        const result = await loadConnectorsState()
        dispatch({
          type: 'connectorsLoaded',
          connectors: result.connectors,
          activeConnectorName: result.activeConnectorName,
        })
        const kafkaConnectors = result.connectors.filter((c) => c.type === 'kafka')
        const connectorName = kafkaConnectors.find((c) => c.name === result.activeConnectorName)?.name
          ?? kafkaConnectors[0]?.name
          ?? null
        if (connectorName) {
          await loadTopicsFor(connectorName)
        }
      } catch (error) {
        dispatch({ type: 'connectorsLoadFailed', error: normalizeError(error) })
      }
    }

    async function loadTopicsFor(connectorName: string): Promise<void> {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const topics = await fetchTopicsForConnector(connectorName, controller.signal)
        dispatch({ type: 'topicsLoaded', topics })
      } catch (error) {
        if (!controller.signal.aborted) {
          dispatch({ type: 'topicsLoadFailed', error: normalizeError(error) })
        }
      }
    }

    async function loadMessages(): Promise<void> {
      const connectorName = state.selectedConnectorName
      const topic = action.type === 'topicSelected' ? action.topic : state.selectedTopic
      if (!connectorName || !topic) return
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const messages = await fetchMessages(connectorName, topic, 50, undefined, controller.signal)
        dispatch({ type: 'messagesLoaded', messages })
      } catch (error) {
        if (!controller.signal.aborted) {
          dispatch({ type: 'messagesLoadFailed', error: normalizeError(error) })
        }
      }
    }

    async function loadOlderMessages(): Promise<void> {
      const connectorName = state.selectedConnectorName
      const topic = state.selectedTopic
      if (!connectorName || !topic || state.messages.length === 0) return
      const oldest = state.messages[state.messages.length - 1]
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const messages = await fetchMessages(connectorName, topic, 50, oldest.timestamp, controller.signal)
        dispatch({ type: 'olderMessagesLoaded', messages })
      } catch (error) {
        if (!controller.signal.aborted) {
          dispatch({ type: 'olderMessagesLoadFailed', error: normalizeError(error) })
        }
      }
    }
  })

  // --- WebSocket effect (live mode) ---
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cleanupWs() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
  }

  useEffect(() => {
    cleanupWs()

    if (!state.selectedConnectorName || !state.selectedTopic || state.mode !== 'live') return

    const connectorName = state.selectedConnectorName
    const topic = state.selectedTopic
    let disposed = false

    function connect() {
      if (disposed) return
      const url = buildTopicStreamWsUrl(connectorName, topic)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = parseWsFrame(event.data as string)
          if (!data) return
          if (data.type === 'message') {
            const msg = wsEventToMessage(data as Parameters<typeof wsEventToMessage>[0])
            if (isKafkaMessage(msg)) {
              dispatch({ type: 'liveMessageReceived', message: msg })
            }
          }
          if (data.type === 'error' && typeof data.error === 'string') {
            dispatch({ type: 'messagesLoadFailed', error: data.error })
          }
        } catch {
          // Intentional: malformed WS frame — skip, next frame will arrive
        }
      }

      ws.onerror = () => ws.close()

      ws.onclose = () => {
        if (disposed) return
        reconnectTimerRef.current = setTimeout(connect, WS_RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      disposed = true
      cleanupWs()
    }
  }, [state.selectedConnectorName, state.selectedTopic, state.mode, dispatch])
}
