import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './KafkaLive.reducer'
import type { KafkaLiveState } from './KafkaLive.types'
import type { ConnectorStatus } from '../../../shared/services/kafka-connectors.service'
import type { KafkaMessage } from '../services/kafka-live.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeConnector = (name: string, type: 'kafka' | 'rabbit' = 'kafka'): ConnectorStatus => ({
  type,
  name,
  endpoint: 'localhost:9092',
  producerConnected: true,
  consumerConnected: true,
  authenticated: false,
})

const makeMessage = (partition: number, offset: number, value = 'v'): KafkaMessage => ({
  partition,
  offset,
  timestamp: '2026-01-01T00:00:00.000Z',
  key: null,
  headers: {},
  value,
})

const stateWith = (overrides: Partial<KafkaLiveState>): KafkaLiveState => ({
  ...createInitialState(),
  ...overrides,
})

// ── connectorsLoaded ─────────────────────────────────────────────────────────

describe('connectorsLoaded', () => {
  it('selects activeConnectorName when it is a kafka connector', () => {
    const connectors = [makeConnector('rabbit-1', 'rabbit'), makeConnector('kafka-1')]
    const next = reducer(createInitialState(), {
      type: 'connectorsLoaded',
      connectors,
      activeConnectorName: 'kafka-1',
    })
    expect(next.selectedConnectorName).toBe('kafka-1')
  })

  it('falls back to first kafka connector when active is rabbit', () => {
    const connectors = [makeConnector('rabbit-1', 'rabbit'), makeConnector('kafka-1')]
    const next = reducer(createInitialState(), {
      type: 'connectorsLoaded',
      connectors,
      activeConnectorName: 'rabbit-1',
    })
    expect(next.selectedConnectorName).toBe('kafka-1')
  })

  it('returns null when no kafka connectors exist', () => {
    const connectors = [makeConnector('rabbit-1', 'rabbit')]
    const next = reducer(createInitialState(), {
      type: 'connectorsLoaded',
      connectors,
      activeConnectorName: 'rabbit-1',
    })
    expect(next.selectedConnectorName).toBeNull()
  })
})

// ── messagesLoadFailed ───────────────────────────────────────────────────────

describe('messagesLoadFailed', () => {
  it('resets both isLoadingMessages and isLoadingOlder', () => {
    const state = stateWith({ isLoadingMessages: true, isLoadingOlder: true })
    const next = reducer(state, { type: 'messagesLoadFailed', error: 'boom' })
    expect(next.isLoadingMessages).toBe(false)
    expect(next.isLoadingOlder).toBe(false)
    expect(next.error).toBe('boom')
  })
})

// ── olderMessagesLoadFailed ──────────────────────────────────────────────────

describe('olderMessagesLoadFailed', () => {
  it('resets isLoadingOlder and sets error', () => {
    const state = stateWith({ isLoadingOlder: true })
    const next = reducer(state, { type: 'olderMessagesLoadFailed', error: 'timeout' })
    expect(next.isLoadingOlder).toBe(false)
    expect(next.error).toBe('timeout')
  })
})

// ── liveMessageReceived ──────────────────────────────────────────────────────

describe('liveMessageReceived', () => {
  it('merges message without touching hasMore', () => {
    const state = stateWith({ hasMore: true, messages: [makeMessage(0, 1)] })
    const next = reducer(state, { type: 'liveMessageReceived', message: makeMessage(0, 2) })
    expect(next.messages).toHaveLength(2)
    expect(next.hasMore).toBe(true)
  })

  it('deduplicates by partition:offset', () => {
    const state = stateWith({ messages: [makeMessage(0, 1)] })
    const next = reducer(state, { type: 'liveMessageReceived', message: makeMessage(0, 1) })
    expect(next.messages).toHaveLength(1)
  })
})

// ── olderMessagesLoaded ──────────────────────────────────────────────────────

describe('olderMessagesLoaded', () => {
  it('deduplicates by partition:offset', () => {
    const existing = makeMessage(0, 10)
    const duplicate = makeMessage(0, 10, 'dup')
    const fresh = makeMessage(0, 9)
    const state = stateWith({ messages: [existing], isLoadingOlder: true })

    const next = reducer(state, { type: 'olderMessagesLoaded', messages: [duplicate, fresh] })
    expect(next.messages).toHaveLength(2)
    expect(next.messages[0]).toBe(existing)
    expect(next.messages[1]).toBe(fresh)
    expect(next.isLoadingOlder).toBe(false)
  })
})

// ── messageSelected ──────────────────────────────────────────────────────────

describe('messageSelected', () => {
  it('stores composite partition:offset key', () => {
    const next = reducer(createInitialState(), { type: 'messageSelected', partition: 3, offset: 42 })
    expect(next.selectedMessageKey).toEqual({ partition: 3, offset: 42 })
    expect(next.isJsonModalOpen).toBe(false)
  })
})
