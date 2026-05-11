/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { fetchApi } from '../../../shared/services/http-api.service'

export type KafkaWsEvent =
  | { type: 'connected'; connectionName: string; topic: string }
  | {
      type: 'message'
      connectionName: string
      topic: string
      partition: number
      offset: number
      timestamp: number
      key: string | null
      headers: Record<string, string>
      value: string
    }
  | { type: 'error'; connectionName: string; topic: string; error: string }

/** Builds a WebSocket URL for streaming Kafka topic messages. */
export function buildTopicStreamWsUrl(connectionName: string, topic: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const params = new URLSearchParams({ connectionName, topic, offsetMode: 'latest' })
  return `${protocol}//${host}/ws/kafka/topic-stream?${params.toString()}`
}

/** Converts a WS message event into a KafkaMessage. */
export function wsEventToMessage(event: KafkaWsEvent & { type: 'message' }): KafkaMessage {
  return {
    partition: event.partition,
    offset: event.offset,
    timestamp: new Date(event.timestamp).toISOString(),
    key: event.key,
    headers: event.headers,
    value: event.value,
  }
}

export type KafkaMessage = {
  partition: number
  offset: number
  timestamp: string
  key: string | null
  headers: Record<string, string>
  value: string
}

/** Fetches messages from a Kafka topic, optionally before a given timestamp for pagination. */
export const fetchMessages = async (
  connectionName: string,
  topic: string,
  limit = 50,
  beforeTimestamp?: string,
  signal?: AbortSignal,
): Promise<KafkaMessage[]> => {
  const params = new URLSearchParams({
    connectionName,
    topic,
    limit: String(limit),
  })
  if (beforeTimestamp) {
    params.set('beforeTimestamp', beforeTimestamp)
  }
  const response = await fetchApi(`/kafka/messages?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = (await response.json()) as unknown // SAFETY: validated with Array.isArray + isKafkaMessage below
  if (!Array.isArray(payload)) {
    throw new Error('Invalid messages response format')
  }
  return payload.filter(isKafkaMessage)
}

export function isKafkaMessage(item: unknown): item is KafkaMessage {
  if (typeof item !== 'object' || item === null) return false
  const m = item as Record<string, unknown>
  return (
    typeof m.partition === 'number' &&
    typeof m.offset === 'number' &&
    typeof m.timestamp === 'string' &&
    (m.key === null || typeof m.key === 'string') &&
    typeof m.headers === 'object' && m.headers !== null &&
    typeof m.value === 'string'
  )
}
