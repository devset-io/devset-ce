import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './MessageDispatch.reducer'
import type { MessageDispatchState } from './MessageDispatch.types'

const stateWith = (overrides: Partial<MessageDispatchState>): MessageDispatchState => ({
  ...createInitialState(),
  ...overrides,
})

// -- connectorChanged ---------------------------------------------------------

describe('connectorChanged', () => {
  it('clears topicSuggestions and exchangeSuggestions when connector changes', () => {
    const state = stateWith({
      selectedConnectorName: 'old',
      topicSuggestions: ['topic-a'],
      exchangeSuggestions: ['exchange-a'],
    })
    const next = reducer(state, { type: 'connectorChanged', name: 'new' })
    expect(next.selectedConnectorName).toBe('new')
    expect(next.topicSuggestions).toEqual([])
    expect(next.exchangeSuggestions).toEqual([])
  })

  it('returns same state when re-selecting the same connector', () => {
    const state = stateWith({
      selectedConnectorName: 'same',
      topicSuggestions: ['topic-a'],
    })
    const next = reducer(state, { type: 'connectorChanged', name: 'same' })
    expect(next).toBe(state)
  })
})

// -- topicSuggestionsLoaded ---------------------------------------------------

describe('topicSuggestionsLoaded', () => {
  it('sets topics when connectorName matches selected', () => {
    const state = stateWith({ selectedConnectorName: 'my-kafka' })
    const next = reducer(state, {
      type: 'topicSuggestionsLoaded',
      connectorName: 'my-kafka',
      topics: ['orders', 'events'],
    })
    expect(next.topicSuggestions).toEqual(['orders', 'events'])
  })

  it('ignores stale response when connectorName does not match', () => {
    const state = stateWith({
      selectedConnectorName: 'new-kafka',
      topicSuggestions: ['existing'],
    })
    const next = reducer(state, {
      type: 'topicSuggestionsLoaded',
      connectorName: 'old-kafka',
      topics: ['stale-topic'],
    })
    expect(next.topicSuggestions).toEqual(['existing'])
  })
})

// -- rabbitBrokerResourcesLoaded ----------------------------------------------

describe('rabbitBrokerResourcesLoaded', () => {
  it('sets queues as topicSuggestions and exchanges as exchangeSuggestions', () => {
    const state = stateWith({ selectedConnectorName: 'my-rabbit' })
    const next = reducer(state, {
      type: 'rabbitBrokerResourcesLoaded',
      connectorName: 'my-rabbit',
      queues: ['order-queue', 'notification-queue'],
      exchanges: ['amq.direct', 'order-exchange'],
    })
    expect(next.topicSuggestions).toEqual(['order-queue', 'notification-queue'])
    expect(next.exchangeSuggestions).toEqual(['amq.direct', 'order-exchange'])
  })

  it('ignores stale response when connectorName does not match', () => {
    const state = stateWith({
      selectedConnectorName: 'new-rabbit',
      topicSuggestions: ['existing-queue'],
      exchangeSuggestions: ['existing-exchange'],
    })
    const next = reducer(state, {
      type: 'rabbitBrokerResourcesLoaded',
      connectorName: 'old-rabbit',
      queues: ['stale-queue'],
      exchanges: ['stale-exchange'],
    })
    expect(next.topicSuggestions).toEqual(['existing-queue'])
    expect(next.exchangeSuggestions).toEqual(['existing-exchange'])
  })

  it('handles empty arrays when management plugin is unavailable', () => {
    const state = stateWith({ selectedConnectorName: 'my-rabbit' })
    const next = reducer(state, {
      type: 'rabbitBrokerResourcesLoaded',
      connectorName: 'my-rabbit',
      queues: [],
      exchanges: [],
    })
    expect(next.topicSuggestions).toEqual([])
    expect(next.exchangeSuggestions).toEqual([])
  })
})
