import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './MessageDispatch.reducer'
import type { CollectionContextEntry, MessageDispatchState } from './MessageDispatch.types'

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

// -- collectionContext modal --------------------------------------------------

const ctxEntry = (id: string, field: string, value: unknown = ''): CollectionContextEntry => ({
  id,
  field,
  value: { kind: 'literal', value },
})

describe('collectionContextModalOpened', () => {
  it('opens the modal, stores the collection name and seeds entries', () => {
    const entries: CollectionContextEntry[] = [ctxEntry('1', 'userId', 'u-1')]
    const next = reducer(createInitialState(), {
      type: 'collectionContextModalOpened',
      collectionName: 'orders',
      entries,
    })
    expect(next.isCollectionContextModalOpen).toBe(true)
    expect(next.collectionContextModalCollectionName).toBe('orders')
    expect(next.collectionContextModalEntries).toBe(entries)
    expect(next.collectionContextModalError).toBeNull()
  })

  it('clears any prior modal error when opening', () => {
    const state = stateWith({ collectionContextModalError: 'stale' })
    const next = reducer(state, {
      type: 'collectionContextModalOpened',
      collectionName: 'orders',
      entries: [],
    })
    expect(next.collectionContextModalError).toBeNull()
  })
})

describe('collectionContextModalClosed', () => {
  it('closes the modal and wipes name/entries/error', () => {
    const state = stateWith({
      isCollectionContextModalOpen: true,
      collectionContextModalCollectionName: 'orders',
      collectionContextModalEntries: [ctxEntry('1', 'userId')],
      collectionContextModalError: 'oops',
    })
    const next = reducer(state, { type: 'collectionContextModalClosed' })
    expect(next.isCollectionContextModalOpen).toBe(false)
    expect(next.collectionContextModalCollectionName).toBe('')
    expect(next.collectionContextModalEntries).toEqual([])
    expect(next.collectionContextModalError).toBeNull()
  })
})

describe('collectionContextEntryAdded', () => {
  it('appends a fresh blank entry with a unique id and literal-empty value', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('existing', 'userId', 'u-1')],
    })
    const next = reducer(state, { type: 'collectionContextEntryAdded' })
    expect(next.collectionContextModalEntries).toHaveLength(2)
    const added = next.collectionContextModalEntries[1]
    expect(added.id).not.toBe('existing')
    expect(added.field).toBe('')
    expect(added.value).toEqual({ kind: 'literal', value: '' })
  })

  it('clears any pending modal error', () => {
    const state = stateWith({ collectionContextModalError: 'duplicate' })
    const next = reducer(state, { type: 'collectionContextEntryAdded' })
    expect(next.collectionContextModalError).toBeNull()
  })
})

describe('collectionContextEntryUpdated', () => {
  it('patches the matching entry and leaves others untouched', () => {
    const state = stateWith({
      collectionContextModalEntries: [
        ctxEntry('a', 'foo', 'foo-val'),
        ctxEntry('b', 'bar', 'bar-val'),
      ],
    })
    const next = reducer(state, {
      type: 'collectionContextEntryUpdated',
      id: 'b',
      patch: { field: 'baz' },
    })
    expect(next.collectionContextModalEntries[0]).toEqual(state.collectionContextModalEntries[0])
    expect(next.collectionContextModalEntries[1].field).toBe('baz')
    expect(next.collectionContextModalEntries[1].value).toEqual({ kind: 'literal', value: 'bar-val' })
  })

  it('is a no-op (entries-wise) when id does not match', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('a', 'foo')],
    })
    const next = reducer(state, {
      type: 'collectionContextEntryUpdated',
      id: 'missing',
      patch: { field: 'changed' },
    })
    expect(next.collectionContextModalEntries).toEqual(state.collectionContextModalEntries)
  })

  it('clears any pending modal error', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('a', 'foo')],
      collectionContextModalError: 'duplicate',
    })
    const next = reducer(state, {
      type: 'collectionContextEntryUpdated',
      id: 'a',
      patch: { field: 'foo2' },
    })
    expect(next.collectionContextModalError).toBeNull()
  })
})

describe('collectionContextEntryRemoved', () => {
  it('drops the entry with the matching id', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('a', 'foo'), ctxEntry('b', 'bar')],
    })
    const next = reducer(state, { type: 'collectionContextEntryRemoved', id: 'a' })
    expect(next.collectionContextModalEntries.map((e) => e.id)).toEqual(['b'])
  })

  it('leaves entries unchanged when id does not match', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('a', 'foo')],
    })
    const next = reducer(state, { type: 'collectionContextEntryRemoved', id: 'missing' })
    expect(next.collectionContextModalEntries).toEqual(state.collectionContextModalEntries)
  })

  it('clears any pending modal error', () => {
    const state = stateWith({
      collectionContextModalEntries: [ctxEntry('a', 'foo')],
      collectionContextModalError: 'duplicate',
    })
    const next = reducer(state, { type: 'collectionContextEntryRemoved', id: 'a' })
    expect(next.collectionContextModalError).toBeNull()
  })
})

describe('collectionContextModalErrorSet', () => {
  it('stores the error message', () => {
    const next = reducer(createInitialState(), {
      type: 'collectionContextModalErrorSet',
      error: 'duplicate field: foo',
    })
    expect(next.collectionContextModalError).toBe('duplicate field: foo')
  })

  it('clears the error when passed null', () => {
    const state = stateWith({ collectionContextModalError: 'stale' })
    const next = reducer(state, { type: 'collectionContextModalErrorSet', error: null })
    expect(next.collectionContextModalError).toBeNull()
  })
})
