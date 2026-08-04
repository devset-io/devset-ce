import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './MessageDispatch.reducer'
import type { CollectionContextEntry, MessageDispatchAction, MessageDispatchState } from './MessageDispatch.types'
import type { ConnectorStatus } from '../../../../../shared/services/kafka-connectors.service'
import type { FieldOverridePayload } from '../../../../flow-builder/types'

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

// -- config -------------------------------------------------------------------

const conn = (name: string): ConnectorStatus => ({
  name,
  type: 'kafka',
  endpoint: 'localhost:9092',
  producerConnected: true,
  consumerConnected: true,
  authenticated: true,
})

describe('configLoaded', () => {
  it('uses the given active connector name when present', () => {
    const next = reducer(createInitialState(), {
      type: 'configLoaded',
      connectors: [conn('a'), conn('b')],
      activeConnectorName: 'b',
      schemas: [],
    })
    expect(next.selectedConnectorName).toBe('b')
    expect(next.isLoadingConfig).toBe(false)
    expect(next.configError).toBeNull()
  })

  it('falls back to the first connector when no active name is given', () => {
    const next = reducer(createInitialState(), {
      type: 'configLoaded',
      connectors: [conn('a'), conn('b')],
      activeConnectorName: null,
      schemas: [],
    })
    expect(next.selectedConnectorName).toBe('a')
  })

  it('falls back to an empty string when there are no connectors', () => {
    const next = reducer(createInitialState(), {
      type: 'configLoaded',
      connectors: [],
      activeConnectorName: null,
      schemas: [],
    })
    expect(next.selectedConnectorName).toBe('')
  })
})

describe('configLoadFailed', () => {
  it('stores the error and clears the loading flag', () => {
    const next = reducer(createInitialState(), { type: 'configLoadFailed', error: 'boom' })
    expect(next.isLoadingConfig).toBe(false)
    expect(next.configError).toBe('boom')
  })
})

describe('connectorsUpdated', () => {
  it('preserves the current selection when it still exists', () => {
    const state = stateWith({ selectedConnectorName: 'b' })
    const next = reducer(state, {
      type: 'connectorsUpdated',
      connectors: [conn('a'), conn('b')],
      activeConnectorName: 'a',
    })
    expect(next.selectedConnectorName).toBe('b')
  })

  it('switches to the active connector when the current one disappears', () => {
    const state = stateWith({ selectedConnectorName: 'gone' })
    const next = reducer(state, {
      type: 'connectorsUpdated',
      connectors: [conn('a')],
      activeConnectorName: 'a',
    })
    expect(next.selectedConnectorName).toBe('a')
  })

  it('falls back to the first connector when neither the current nor active one is available', () => {
    const state = stateWith({ selectedConnectorName: 'gone' })
    const next = reducer(state, {
      type: 'connectorsUpdated',
      connectors: [conn('a')],
      activeConnectorName: null,
    })
    expect(next.selectedConnectorName).toBe('a')
  })
})

// -- payload / studio -----------------------------------------------------------

describe('payload editor actions', () => {
  it('stepStateRawChanged and stepStateBeautified both replace stepStateRaw', () => {
    expect(reducer(createInitialState(), { type: 'stepStateRawChanged', value: '{"a":1}' }).stepStateRaw).toBe('{"a":1}')
    expect(reducer(createInitialState(), { type: 'stepStateBeautified', value: '{\n  "a": 1\n}' }).stepStateRaw).toBe(
      '{\n  "a": 1\n}',
    )
  })

  it('studioOverrideApplied merges the override and selects the field', () => {
    const payload = { mode: 'literal', value: 'x' } as unknown as FieldOverridePayload
    const next = reducer(createInitialState(), { type: 'studioOverrideApplied', field: 'foo', payload })
    expect(next.studioOverridesByField.foo).toEqual(payload)
    expect(next.studioSelectedField).toBe('foo')
  })

  it('studioStateReset clears overrides, selected field, and scope path', () => {
    const state = stateWith({
      studioOverridesByField: { foo: {} as FieldOverridePayload },
      studioSelectedField: 'foo',
      studioScopePath: '$.foo',
    })
    const next = reducer(state, { type: 'studioStateReset' })
    expect(next.studioOverridesByField).toEqual({})
    expect(next.studioSelectedField).toBe('')
    expect(next.studioScopePath).toBe('')
  })

  it('schemaTemplateApplied replaces stepStateRaw and clears studio state', () => {
    const state = stateWith({ studioSelectedField: 'foo', studioScopePath: '$.foo' })
    const next = reducer(state, { type: 'schemaTemplateApplied', stepStateRaw: '{"tpl":true}' })
    expect(next.stepStateRaw).toBe('{"tpl":true}')
    expect(next.studioSelectedField).toBe('')
    expect(next.studioScopePath).toBe('')
  })
})

// -- wire format ------------------------------------------------------------------

describe('wireFormatEnabledChanged', () => {
  it('clears the error and disables when turned off', () => {
    const state = stateWith({ wireFormatEnabled: true, wireFormatPrefixValueError: 'invalid-range' })
    const next = reducer(state, { type: 'wireFormatEnabledChanged', enabled: false })
    expect(next.wireFormatEnabled).toBe(false)
    expect(next.wireFormatPrefixValueError).toBeNull()
  })

  it('enables and keeps a valid prefix value as-is', () => {
    const state = stateWith({ wireFormatPrefixValue: '42' })
    const next = reducer(state, { type: 'wireFormatEnabledChanged', enabled: true })
    expect(next.wireFormatEnabled).toBe(true)
    expect(next.wireFormatPrefixValue).toBe('42')
  })

  it('enables and resets an invalid prefix value to "0"', () => {
    const state = stateWith({ wireFormatPrefixValue: 'not-a-number' })
    const next = reducer(state, { type: 'wireFormatEnabledChanged', enabled: true })
    expect(next.wireFormatEnabled).toBe(true)
    expect(next.wireFormatPrefixValue).toBe('0')
  })
})

describe('wireFormatRestoredFromHistory', () => {
  it('applies a valid binary-prefix wire format from history', () => {
    const next = reducer(createInitialState(), {
      type: 'wireFormatRestoredFromHistory',
      wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 8 } },
    })
    expect(next.wireFormatEnabled).toBe(true)
    expect(next.wireFormatPrefixValue).toBe('8')
  })

  it('resets to defaults when no wire format is present', () => {
    const state = stateWith({ wireFormatEnabled: true, wireFormatPrefixValue: '8' })
    const next = reducer(state, { type: 'wireFormatRestoredFromHistory', wireFormat: undefined })
    expect(next.wireFormatEnabled).toBe(false)
    expect(next.wireFormatPrefixValue).toBe('0')
  })
})

// -- history / execution -----------------------------------------------------------

describe('history and execution actions', () => {
  it('historyLoaded / historyLoadFailed', () => {
    const loaded = reducer(createInitialState(), { type: 'historyLoaded', items: [] })
    expect(loaded.isHistoryLoading).toBe(false)
    expect(loaded.historyError).toBeNull()

    const failed = reducer(createInitialState(), { type: 'historyLoadFailed', error: 'oops' })
    expect(failed.isHistoryLoading).toBe(false)
    expect(failed.historyError).toBe('oops')
  })

  it('sendStarted / sendCompleted / sendFailed / sendErrorCleared', () => {
    const started = reducer(stateWith({ sendError: 'stale' }), { type: 'sendStarted' })
    expect(started.isSending).toBe(true)
    expect(started.sendError).toBeNull()

    const completed = reducer(stateWith({ isSending: true }), { type: 'sendCompleted' })
    expect(completed.isSending).toBe(false)

    const failed = reducer(stateWith({ isSending: true }), { type: 'sendFailed', error: 'network' })
    expect(failed.isSending).toBe(false)
    expect(failed.sendError).toBe('network')

    const cleared = reducer(stateWith({ sendError: 'network' }), { type: 'sendErrorCleared' })
    expect(cleared.sendError).toBeNull()
  })
})

// -- collections / saved requests -----------------------------------------------------

describe('collections and saved-request bookkeeping actions', () => {
  it('collectionsLoaded replaces the collections list and clears loading/error', () => {
    const next = reducer(createInitialState(), {
      type: 'collectionsLoaded',
      collections: [{ collectionName: 'a', collectionContext: {} }],
    })
    expect(next.collections).toEqual([{ collectionName: 'a', collectionContext: {} }])
    expect(next.isCollectionsLoading).toBe(false)
    expect(next.collectionsError).toBeNull()
  })

  it('savingSingleRequestStarted / savingSingleRequestCompleted toggle the saving flag', () => {
    expect(reducer(createInitialState(), { type: 'savingSingleRequestStarted' }).isSavingSingleRequest).toBe(true)
    expect(
      reducer(stateWith({ isSavingSingleRequest: true }), { type: 'savingSingleRequestCompleted' }).isSavingSingleRequest,
    ).toBe(false)
  })

  it('loadedSelectionCleared wipes the loaded single-request selection', () => {
    const state = stateWith({
      selectedSingleRequestName: 'req-a',
      loadedSingleRequestCollectionName: 'col-a',
      singleRequestNameRaw: 'req-a',
    })
    const next = reducer(state, { type: 'loadedSelectionCleared' })
    expect(next.selectedSingleRequestName).toBeNull()
    expect(next.loadedSingleRequestCollectionName).toBeNull()
    expect(next.singleRequestNameRaw).toBe('')
  })

  it('requestRenameCompleted dismisses the inline editor', () => {
    const state = stateWith({ editingRequest: { collectionName: 'c', currentName: 'a', nextName: 'b' } })
    expect(reducer(state, { type: 'requestRenameCompleted' }).editingRequest).toBeNull()
  })
})

// -- collection context modal saving flag ------------------------------------------------

describe('collection context saving flags', () => {
  it('savingCollectionContextStarted / savingCollectionContextCompleted toggle the flag', () => {
    expect(reducer(createInitialState(), { type: 'savingCollectionContextStarted' }).isSavingCollectionContext).toBe(true)
    expect(
      reducer(stateWith({ isSavingCollectionContext: true }), { type: 'savingCollectionContextCompleted' })
        .isSavingCollectionContext,
    ).toBe(false)
  })
})

// -- bulk hydration ------------------------------------------------------------------

describe('draftHydratedFromHistory / draftHydratedFromSavedRequest', () => {
  it('spreads the patch directly onto state', () => {
    const fromHistory = reducer(createInitialState(), {
      type: 'draftHydratedFromHistory',
      patch: { topicRaw: 'orders', contentMode: 'protobuf' },
    })
    expect(fromHistory.topicRaw).toBe('orders')
    expect(fromHistory.contentMode).toBe('protobuf')

    const fromSavedRequest = reducer(createInitialState(), {
      type: 'draftHydratedFromSavedRequest',
      patch: { topicRaw: 'events' },
    })
    expect(fromSavedRequest.topicRaw).toBe('events')
  })
})

// -- tabClosed edge case --------------------------------------------------------------

describe('tabClosed with an unknown id', () => {
  it('is a no-op', () => {
    const state = createInitialState()
    expect(reducer(state, { type: 'tabClosed', id: 'does-not-exist' })).toBe(state)
  })
})

// -- side-effect-only actions ----------------------------------------------------------

describe('side-effect-only actions', () => {
  it('return the same state unchanged', () => {
    const state = createInitialState()
    const sideEffectActions: MessageDispatchAction[] = [
      { type: 'init' },
      { type: 'send' },
      { type: 'refreshHistory' },
      { type: 'refreshCollections' },
      { type: 'createCollection' },
      { type: 'deleteCollection', name: 'col' },
      { type: 'cloneCollection', name: 'col' },
      { type: 'loadCollection', name: 'col' },
      { type: 'loadSingleRequest', name: 'req', collectionName: 'col' },
      { type: 'deleteSingleRequest', name: 'req', collectionName: 'col' },
      { type: 'saveSingleRequest' },
      { type: 'submitRequestRename' },
      { type: 'applyProtoSchemaBase' },
      { type: 'importProtoSchema', schemaId: 's1' },
      { type: 'importJsonSchema', schemaId: 's1' },
      { type: 'loadHistoryEntry', historyId: 'h1' },
      { type: 'previewHistoryEntry', historyId: 'h1' },
      { type: 'saveModalSubmit' },
    ]
    for (const action of sideEffectActions) {
      expect(reducer(state, action)).toBe(state)
    }
  })
})

describe('remaining small config/execution actions', () => {
  it('kafkaHeadersSet converts a headers record into rows', () => {
    const next = reducer(createInitialState(), { type: 'kafkaHeadersSet', headers: { 'X-Trace': 'abc' } })
    expect(next.kafkaHeadersRows.map((r) => [r.key, r.value])).toEqual([['X-Trace', 'abc']])
  })

  it('protoBaseApplied / protoBaseCleared toggle isProtoBaseApplied', () => {
    expect(reducer(createInitialState(), { type: 'protoBaseApplied' }).isProtoBaseApplied).toBe(true)
    expect(reducer(stateWith({ isProtoBaseApplied: true }), { type: 'protoBaseCleared' }).isProtoBaseApplied).toBe(false)
  })

  it('selectedSchemaIdChanged / appliedProtoSchemaChanged replace their fields', () => {
    expect(reducer(createInitialState(), { type: 'selectedSchemaIdChanged', id: 's1' }).selectedSchemaId).toBe('s1')
    expect(reducer(createInitialState(), { type: 'appliedProtoSchemaChanged', value: 'message X {}' }).appliedProtoSchemaRaw).toBe(
      'message X {}',
    )
  })

  it('protoResyncRequired sets the flag from the action', () => {
    expect(reducer(createInitialState(), { type: 'protoResyncRequired', value: true }).isProtoResyncRequired).toBe(true)
  })

  it('loadedHistoryCleared wipes the loaded history pointers', () => {
    const state = stateWith({
      loadedHistoryMetadata: { executions: 1, stage: 's', event: 'e', headers: {}, workflowState: {} },
      loadedFromHistoryId: 'h1',
    })
    const next = reducer(state, { type: 'loadedHistoryCleared' })
    expect(next.loadedHistoryMetadata).toBeNull()
    expect(next.loadedFromHistoryId).toBeNull()
  })

  it('savingSingleRequestFailed clears the saving flag', () => {
    const next = reducer(stateWith({ isSavingSingleRequest: true }), { type: 'savingSingleRequestFailed' })
    expect(next.isSavingSingleRequest).toBe(false)
  })
})

describe('exhaustiveness guard', () => {
  it('does not throw for an unrecognised action type', () => {
    const state = createInitialState()
    const bogus = { type: 'not-a-real-action' } as unknown as MessageDispatchAction
    expect(() => reducer(state, bogus)).not.toThrow()
  })
})
