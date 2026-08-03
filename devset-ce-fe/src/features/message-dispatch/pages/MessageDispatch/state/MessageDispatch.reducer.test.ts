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

// -- tabs ---------------------------------------------------------------------

describe('tabs', () => {
  it('starts with a single active scratch tab', () => {
    const state = createInitialState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].savedRequestRef).toBeNull()
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('tabOpenedScratch stashes the current form and resets to defaults', () => {
    const state = stateWith({ topicRaw: 'orders', stepStateRaw: '{"a":1}' })
    const next = reducer(state, { type: 'tabOpenedScratch' })

    expect(next.tabs).toHaveLength(2)
    expect(next.activeTabId).toBe(next.tabs[1].id)
    // outgoing tab keeps the stashed form
    expect(next.tabs[0].formSnapshot?.topicRaw).toBe('orders')
    // live form is reset for the new scratch tab
    expect(next.topicRaw).toBe('')
    expect(next.stepStateRaw).toBe(createInitialState().stepStateRaw)
  })

  it('tabOpenedFromSavedRequest adds a tab at the front with the ref and null snapshot', () => {
    const state = createInitialState()
    const ref = { collectionName: 'col', singleRequestName: 'req-a' }
    const next = reducer(state, { type: 'tabOpenedFromSavedRequest', ref })

    const opened = next.tabs[0]
    expect(next.tabs).toHaveLength(2)
    expect(next.activeTabId).toBe(opened.id)
    expect(opened.savedRequestRef).toEqual(ref)
    expect(opened.formSnapshot).toBeNull()
    expect(opened.title).toBe('req-a')
    expect(opened.order).toBe(0)
  })

  it('tabSwitched stashes the active form and restores the target snapshot', () => {
    const opened = reducer(
      stateWith({ topicRaw: 'first' }),
      { type: 'tabOpenedScratch' },
    )
    const edited = reducer(opened, { type: 'topicChanged', value: 'second' })
    const firstTabId = edited.tabs[0].id

    const back = reducer(edited, { type: 'tabSwitched', id: firstTabId })

    expect(back.activeTabId).toBe(firstTabId)
    expect(back.topicRaw).toBe('first')
    // the tab we left keeps its edited value
    const secondTab = back.tabs.find((t) => t.id === edited.activeTabId)
    expect(secondTab?.formSnapshot?.topicRaw).toBe('second')
  })

  it('tabSwitched is a no-op for the active tab and for unknown ids', () => {
    const state = createInitialState()
    expect(reducer(state, { type: 'tabSwitched', id: state.activeTabId! })).toBe(state)
    expect(reducer(state, { type: 'tabSwitched', id: 'nope' })).toBe(state)
  })

  it('tabClosed activates a neighbour and restores its snapshot', () => {
    const opened = reducer(stateWith({ topicRaw: 'first' }), { type: 'tabOpenedScratch' })
    const edited = reducer(opened, { type: 'topicChanged', value: 'second' })

    const closed = reducer(edited, { type: 'tabClosed', id: edited.activeTabId! })

    expect(closed.tabs).toHaveLength(1)
    expect(closed.activeTabId).toBe(closed.tabs[0].id)
    expect(closed.topicRaw).toBe('first')
  })

  it('tabClosed on the last tab leaves a fresh scratch tab', () => {
    const state = stateWith({ topicRaw: 'orders' })
    const closed = reducer(state, { type: 'tabClosed', id: state.activeTabId! })

    expect(closed.tabs).toHaveLength(1)
    expect(closed.tabs[0].savedRequestRef).toBeNull()
    expect(closed.topicRaw).toBe('')
  })

  it('tabClosed on an inactive tab keeps the active one', () => {
    const opened = reducer(createInitialState(), { type: 'tabOpenedScratch' })
    const inactiveId = opened.tabs[0].id

    const closed = reducer(opened, { type: 'tabClosed', id: inactiveId })

    expect(closed.tabs).toHaveLength(1)
    expect(closed.activeTabId).toBe(opened.activeTabId)
  })

  it('tabsHydrated restores tabs and applies the active snapshot', () => {
    const seed = reducer(stateWith({ topicRaw: 'restored' }), { type: 'tabOpenedScratch' })
    // simulate what a repository load would carry back
    const persistedTabs = reducer(seed, { type: 'tabSwitched', id: seed.tabs[0].id }).tabs
    const targetId = seed.tabs[0].id

    const hydrated = reducer(createInitialState(), {
      type: 'tabsHydrated',
      tabs: persistedTabs,
      activeTabId: targetId,
    })

    expect(hydrated.tabs).toHaveLength(2)
    expect(hydrated.activeTabId).toBe(targetId)
    expect(hydrated.topicRaw).toBe('restored')
  })

  it('tabsHydrated is a no-op for an empty tab list', () => {
    const state = createInitialState()
    expect(reducer(state, { type: 'tabsHydrated', tabs: [], activeTabId: null })).toBe(state)
  })

  it('serverTabsMerged appends unknown tabs while preserving active tab and edits', () => {
    const state = stateWith({ topicRaw: 'in-progress' })
    const serverTab = {
      id: 'from-other-device',
      savedRequestRef: { collectionName: 'col', singleRequestName: 'req-b' },
      formSnapshot: null,
      activeHistoryRef: null,
      title: 'req-b',
      order: 0,
    }

    const merged = reducer(state, { type: 'serverTabsMerged', tabs: [serverTab] })

    expect(merged.tabs).toHaveLength(2)
    expect(merged.tabs.map((t) => t.id)).toEqual([state.tabs[0].id, 'from-other-device'])
    expect(merged.tabs.map((t) => t.order)).toEqual([0, 1])
    // the live active tab and its in-progress edit are untouched
    expect(merged.activeTabId).toBe(state.activeTabId)
    expect(merged.topicRaw).toBe('in-progress')
  })

  it('serverTabsMerged is a no-op when every incoming tab is already open', () => {
    const state = createInitialState()
    const alreadyOpen = { ...state.tabs[0] }
    expect(reducer(state, { type: 'serverTabsMerged', tabs: [alreadyOpen] })).toBe(state)
  })

  // Stash invariant guard: only the active tab's fields are ever live on
  // MessageDispatchState. Editing the active tab, or switching between two OTHER
  // tabs, must never reach into a third tab's stashed formSnapshot.
  it('stash invariant: a tab not involved in the current edit or switch keeps its snapshot untouched', () => {
    const withZero = reducer(stateWith({ topicRaw: 'zero' }), { type: 'tabOpenedScratch' })
    const tab0Id = withZero.tabs[0].id

    const withOne = reducer(
      reducer(withZero, { type: 'topicChanged', value: 'one' }),
      { type: 'tabOpenedScratch' },
    )
    const tab1Id = withOne.tabs[1].id
    const tab2Id = withOne.tabs[2].id

    const withTwo = reducer(withOne, { type: 'topicChanged', value: 'two' })

    // Before any switch: tab0 and tab1 are stashed, tab2 is live.
    expect(withTwo.tabs.find((t) => t.id === tab0Id)?.formSnapshot?.topicRaw).toBe('zero')
    expect(withTwo.tabs.find((t) => t.id === tab1Id)?.formSnapshot?.topicRaw).toBe('one')
    expect(withTwo.topicRaw).toBe('two')

    // Switching tab2 -> tab0 stashes tab2 and hydrates tab0; tab1 is not involved
    // and must remain exactly as it was stashed.
    const back = reducer(withTwo, { type: 'tabSwitched', id: tab0Id })
    expect(back.topicRaw).toBe('zero')
    expect(back.tabs.find((t) => t.id === tab2Id)?.formSnapshot?.topicRaw).toBe('two')
    expect(back.tabs.find((t) => t.id === tab1Id)?.formSnapshot?.topicRaw).toBe('one')
  })
})

// -- singleRequestSelected syncs the active tab -------------------------------

describe('singleRequestSelected tab sync', () => {
  it('sets the active tab ref and title when a request is selected', () => {
    const state = createInitialState()
    const next = reducer(state, {
      type: 'singleRequestSelected',
      name: 'orders-req',
      collectionName: 'col',
    })
    expect(next.tabs[0].savedRequestRef).toEqual({
      collectionName: 'col',
      singleRequestName: 'orders-req',
    })
    expect(next.tabs[0].title).toBe('orders-req')
  })

  it('resets the active tab to scratch when the selection is cleared', () => {
    const loaded = reducer(createInitialState(), {
      type: 'singleRequestSelected',
      name: 'orders-req',
      collectionName: 'col',
    })
    const cleared = reducer(loaded, {
      type: 'singleRequestSelected',
      name: null,
      collectionName: null,
    })
    expect(cleared.tabs[0].savedRequestRef).toBeNull()
    expect(cleared.tabs[0].title).toBe('Untitled')
  })
})
