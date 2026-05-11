import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './Settings.reducer'
import { createDefaultDraft, getDefaultConnectorName, toConnectorDraft, toConnectorRequest } from './Settings.types'
import type { ConnectorDraft, SettingsState } from './Settings.types'
import type { ConnectorStatus } from '../../../../../shared/services/kafka-connectors.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeConnector = (name: string, type: 'kafka' | 'rabbit' = 'kafka'): ConnectorStatus => ({
  type,
  name,
  endpoint: type === 'kafka' ? 'localhost:29092' : 'amqp://localhost:5672/',
  producerConnected: true,
  consumerConnected: true,
  authenticated: false,
})


// ── createInitialState ─────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('returns default kafka draft', () => {
    const state = createInitialState()
    expect(state.draft.type).toBe('kafka')
    expect(state.draft.name).toBe('local-kafka')
    expect(state.isSubmitting).toBe(false)
    expect(state.connectors).toEqual([])
  })
})

// ── getDefaultConnectorName ────────────────────────────────────────────────────

describe('getDefaultConnectorName', () => {
  it('returns local-kafka for kafka', () => {
    expect(getDefaultConnectorName('kafka')).toBe('local-kafka')
  })

  it('returns local-rabbit for rabbit', () => {
    expect(getDefaultConnectorName('rabbit')).toBe('local-rabbit')
  })
})

// ── createDefaultDraft ─────────────────────────────────────────────────────────

describe('createDefaultDraft', () => {
  it('defaults to kafka when no type provided', () => {
    const draft = createDefaultDraft()
    expect(draft.type).toBe('kafka')
    expect(draft.bootstrapServers).toBe('localhost:29092')
  })

  it('creates rabbit draft with rabbit defaults', () => {
    const draft = createDefaultDraft('rabbit')
    expect(draft.type).toBe('rabbit')
    expect(draft.host).toBe('localhost')
    expect(draft.port).toBe('5672')
    expect(draft.virtualHost).toBe('/')
  })
})

// ── toConnectorDraft / toConnectorRequest ──────────────────────────────────────

describe('toConnectorDraft', () => {
  it('converts kafka request to draft', () => {
    const draft = toConnectorDraft({ type: 'kafka', name: 'test', bootstrapServers: 'host:9092', username: null, password: null })
    expect(draft.type).toBe('kafka')
    expect(draft.bootstrapServers).toBe('host:9092')
    expect(draft.name).toBe('test')
  })

  it('converts rabbit request to draft', () => {
    const draft = toConnectorDraft({ type: 'rabbit', name: 'rb', host: 'rmq', port: 5673, virtualHost: '/vhost', username: null, password: null })
    expect(draft.type).toBe('rabbit')
    expect(draft.host).toBe('rmq')
    expect(draft.port).toBe('5673')
    expect(draft.virtualHost).toBe('/vhost')
  })
})

describe('toConnectorRequest', () => {
  it('converts kafka draft to request, trimming values', () => {
    const draft: ConnectorDraft = { type: 'kafka', name: '  my-kafka  ', bootstrapServers: ' host:9092 ', host: '', port: '', virtualHost: '', username: ' user ', password: '' }
    const req = toConnectorRequest(draft)
    expect(req.type).toBe('kafka')
    if (req.type === 'kafka') {
      expect(req.name).toBe('my-kafka')
      expect(req.bootstrapServers).toBe('host:9092')
      expect(req.username).toBe('user')
      expect(req.password).toBeNull()
    }
  })

  it('converts rabbit draft to request with parsed port', () => {
    const draft: ConnectorDraft = { type: 'rabbit', name: 'rb', bootstrapServers: '', host: 'rmq', port: '5673', virtualHost: '/v', username: '', password: '' }
    const req = toConnectorRequest(draft)
    expect(req.type).toBe('rabbit')
    if (req.type === 'rabbit') {
      expect(req.port).toBe(5673)
      expect(req.host).toBe('rmq')
      expect(req.username).toBeNull()
    }
  })
})

// ── reducer ────────────────────────────────────────────────────────────────────

describe('Settings reducer', () => {
  it('effect-only actions return new reference', () => {
    const state = createInitialState()
    const next = reducer(state, { type: 'init' })
    expect(next).not.toBe(state)
    expect(next).toEqual(state)
  })

  it('refreshStart sets isRefreshing and clears error', () => {
    const state = { ...createInitialState(), connectionsError: 'old error' }
    const next = reducer(state, { type: 'refreshStart' })
    expect(next.isRefreshing).toBe(true)
    expect(next.connectionsError).toBeNull()
  })

  it('refreshSuccess stores connectors', () => {
    const connectors = [makeConnector('c1')]
    const next = reducer(createInitialState(), { type: 'refreshSuccess', connectors, activeConnectorName: 'c1' })
    expect(next.connectors).toEqual(connectors)
    expect(next.activeConnectorName).toBe('c1')
    expect(next.isRefreshing).toBe(false)
  })

  it('refreshFailed stores error', () => {
    const next = reducer(createInitialState(), { type: 'refreshFailed', error: 'boom' })
    expect(next.connectionsError).toBe('boom')
    expect(next.isRefreshing).toBe(false)
  })

  it('draftFieldChanged updates specific field', () => {
    const next = reducer(createInitialState(), { type: 'draftFieldChanged', field: 'name', value: 'my-conn' })
    expect(next.draft.name).toBe('my-conn')
  })

  it('connectorTypeChanged swaps default name', () => {
    const state = createInitialState() // name = 'local-kafka'
    const next = reducer(state, { type: 'connectorTypeChanged', connectorType: 'rabbit' })
    expect(next.draft.type).toBe('rabbit')
    expect(next.draft.name).toBe('local-rabbit')
  })

  it('connectorTypeChanged preserves custom name', () => {
    const state = { ...createInitialState(), draft: { ...createDefaultDraft(), name: 'custom' } }
    const next = reducer(state, { type: 'connectorTypeChanged', connectorType: 'rabbit' })
    expect(next.draft.name).toBe('custom')
  })

  it('startNewConnector resets draft and editing state', () => {
    const state: SettingsState = {
      ...createInitialState(),
      editingConnectorName: 'c1',
      draftRequiresAttention: true,
      draftRequiresCredentials: true,
      isOverwriteConfirmOpen: true,
    }
    const next = reducer(state, { type: 'startNewConnector' })
    expect(next.editingConnectorName).toBeNull()
    expect(next.draftRequiresAttention).toBe(false)
    expect(next.isOverwriteConfirmOpen).toBe(false)
  })

  it('editingLoaded sets draft and editing metadata', () => {
    const draft = createDefaultDraft('rabbit')
    const next = reducer(createInitialState(), {
      type: 'editingLoaded',
      draft,
      editingName: 'rb1',
      requiresAttention: true,
      requiresCredentials: false,
    })
    expect(next.draft).toBe(draft)
    expect(next.editingConnectorName).toBe('rb1')
    expect(next.draftRequiresAttention).toBe(true)
  })

  it('openOverwriteConfirm / closeOverwriteConfirm toggles flag', () => {
    let state = reducer(createInitialState(), { type: 'openOverwriteConfirm' })
    expect(state.isOverwriteConfirmOpen).toBe(true)
    state = reducer(state, { type: 'closeOverwriteConfirm' })
    expect(state.isOverwriteConfirmOpen).toBe(false)
  })

  it('submitStart / submitFailed cycle', () => {
    let state = reducer(createInitialState(), { type: 'submitStart' })
    expect(state.isSubmitting).toBe(true)
    state = reducer(state, { type: 'submitFailed' })
    expect(state.isSubmitting).toBe(false)
  })

  it('submitSuccess sets editing state', () => {
    const draft = createDefaultDraft()
    const next = reducer(createInitialState(), { type: 'submitSuccess', draft, connectorName: 'c1' })
    expect(next.isSubmitting).toBe(false)
    expect(next.editingConnectorName).toBe('c1')
    expect(next.isOverwriteConfirmOpen).toBe(false)
  })

  it('requestDelete sets connectorPendingDelete', () => {
    const connector = makeConnector('c1')
    const next = reducer(createInitialState(), { type: 'requestDelete', connector })
    expect(next.connectorPendingDelete).toBe(connector)
  })

  it('requestDeleteEditing finds connector by editingConnectorName', () => {
    const connector = makeConnector('c1')
    const state: SettingsState = { ...createInitialState(), connectors: [connector], editingConnectorName: 'c1' }
    const next = reducer(state, { type: 'requestDeleteEditing' })
    expect(next.connectorPendingDelete).toBe(connector)
  })

  it('requestDeleteEditing no-ops if editingConnectorName not found', () => {
    const state: SettingsState = { ...createInitialState(), editingConnectorName: 'nonexistent' }
    const next = reducer(state, { type: 'requestDeleteEditing' })
    expect(next).toBe(state)
  })

  it('deleteSuccess resets draft when wasEditing=true', () => {
    const state: SettingsState = { ...createInitialState(), editingConnectorName: 'c1', isSubmitting: true }
    const next = reducer(state, { type: 'deleteSuccess', deletedName: 'c1', deletedType: 'kafka', wasEditing: true })
    expect(next.editingConnectorName).toBeNull()
    expect(next.isSubmitting).toBe(false)
    expect(next.draft.name).toBe('local-kafka')
  })

  it('deleteSuccess only clears pending when wasEditing=false', () => {
    const connector = makeConnector('c2')
    const state: SettingsState = { ...createInitialState(), connectorPendingDelete: connector, editingConnectorName: 'c1', isSubmitting: true }
    const next = reducer(state, { type: 'deleteSuccess', deletedName: 'c2', deletedType: 'kafka', wasEditing: false })
    expect(next.editingConnectorName).toBe('c1')
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('closeDeleteModal clears connectorPendingDelete', () => {
    const connector = makeConnector('c1')
    const state: SettingsState = { ...createInitialState(), connectorPendingDelete: connector }
    const next = reducer(state, { type: 'closeDeleteModal' })
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('activeConnectorChanged updates activeConnectorName', () => {
    const next = reducer(createInitialState(), { type: 'activeConnectorChanged', activeConnectorName: 'c1' })
    expect(next.activeConnectorName).toBe('c1')
  })

  it('unknown action returns same state', () => {
    const state = createInitialState()
    // @ts-expect-error — testing default branch
    const next = reducer(state, { type: 'nonexistent' })
    expect(next).toBe(state)
  })
})
