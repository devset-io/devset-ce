import { describe, expect, it } from 'vitest'
import { createDbInitialState, dbConnectorsReducer } from './DbConnectors.reducer'
import { createDefaultDbDraft, getDefaultDbConnectorName, toDbConnectorDraft } from './DbConnectors.types'
import type { DbConnectorsAction, DbConnectorsState } from './DbConnectors.types'
import type { DbConnectorStatus } from '../../../../../shared/services/db-connectors.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeDbConnector = (name: string, type: 'mongodb' | 'postgres' = 'mongodb'): DbConnectorStatus => ({
  type,
  name,
  connectionString: type === 'mongodb' ? 'mongodb://localhost:27017' : 'postgres://localhost:5432',
  database: 'testdb',
  connected: true,
  authenticated: false,
})

// ── createDbInitialState ───────────────────────────────────────────────────────

describe('createDbInitialState', () => {
  it('returns default mongodb draft', () => {
    const state = createDbInitialState()
    expect(state.draft.type).toBe('mongodb')
    expect(state.draft.name).toBe('local-mongo')
    expect(state.draft.connectionString).toBe('mongodb://localhost:27017')
    expect(state.isSubmitting).toBe(false)
    expect(state.connectors).toEqual([])
  })
})

// ── getDefaultDbConnectorName ──────────────────────────────────────────────────

describe('getDefaultDbConnectorName', () => {
  it('returns local-mongo for mongodb', () => {
    expect(getDefaultDbConnectorName('mongodb')).toBe('local-mongo')
  })

  it('returns local-postgres for postgres', () => {
    expect(getDefaultDbConnectorName('postgres')).toBe('local-postgres')
  })
})

// ── createDefaultDbDraft ───────────────────────────────────────────────────────

describe('createDefaultDbDraft', () => {
  it('defaults to mongodb when no type provided', () => {
    const draft = createDefaultDbDraft()
    expect(draft.type).toBe('mongodb')
    expect(draft.connectionString).toBe('mongodb://localhost:27017')
  })

  it('creates postgres draft with empty connectionString', () => {
    const draft = createDefaultDbDraft('postgres')
    expect(draft.type).toBe('postgres')
    expect(draft.name).toBe('local-postgres')
    expect(draft.connectionString).toBe('')
  })
})

// ── toDbConnectorDraft ─────────────────────────────────────────────────────────

describe('toDbConnectorDraft', () => {
  it('converts mongodb connector status to draft', () => {
    const draft = toDbConnectorDraft(makeDbConnector('prod-mongo'))
    expect(draft.type).toBe('mongodb')
    expect(draft.name).toBe('prod-mongo')
    expect(draft.connectionString).toBe('mongodb://localhost:27017')
    expect(draft.username).toBe('')
    expect(draft.password).toBe('')
  })

  it('converts postgres connector status to draft', () => {
    const draft = toDbConnectorDraft(makeDbConnector('prod-pg', 'postgres'))
    expect(draft.type).toBe('postgres')
    expect(draft.name).toBe('prod-pg')
    expect(draft.connectionString).toBe('postgres://localhost:5432')
  })
})

// ── dbConnectorsReducer ────────────────────────────────────────────────────────

describe('DbConnectors reducer', () => {
  it('effect-only actions return new reference', () => {
    const state = createDbInitialState()
    for (const type of ['init', 'refresh', 'connect', 'confirmOverwrite', 'confirmDelete'] as const) {
      const next = dbConnectorsReducer(state, { type } as DbConnectorsAction)
      expect(next).not.toBe(state)
      expect(next).toEqual(state)
    }
  })

  it('refreshStart sets isRefreshing and clears error', () => {
    const state = { ...createDbInitialState(), connectionsError: 'old' }
    const next = dbConnectorsReducer(state, { type: 'refreshStart' })
    expect(next.isRefreshing).toBe(true)
    expect(next.connectionsError).toBeNull()
  })

  it('refreshSuccess stores connectors', () => {
    const connectors = [makeDbConnector('m1')]
    const next = dbConnectorsReducer(createDbInitialState(), { type: 'refreshSuccess', connectors })
    expect(next.connectors).toEqual(connectors)
    expect(next.isRefreshing).toBe(false)
  })

  it('refreshFailed stores error', () => {
    const next = dbConnectorsReducer(createDbInitialState(), { type: 'refreshFailed', error: 'fail' })
    expect(next.connectionsError).toBe('fail')
    expect(next.isRefreshing).toBe(false)
  })

  it('draftFieldChanged updates specific field', () => {
    const next = dbConnectorsReducer(createDbInitialState(), { type: 'draftFieldChanged', field: 'connectionString', value: 'mongodb://remote:27017' })
    expect(next.draft.connectionString).toBe('mongodb://remote:27017')
  })

  it('dbTypeChanged swaps default name and connectionString', () => {
    const state = createDbInitialState() // mongodb, local-mongo
    const next = dbConnectorsReducer(state, { type: 'dbTypeChanged', dbType: 'postgres' })
    expect(next.draft.type).toBe('postgres')
    expect(next.draft.name).toBe('local-postgres')
    expect(next.draft.connectionString).toBe('')
  })

  it('dbTypeChanged preserves custom name', () => {
    const state: DbConnectorsState = { ...createDbInitialState(), draft: { ...createDefaultDbDraft(), name: 'custom-db' } }
    const next = dbConnectorsReducer(state, { type: 'dbTypeChanged', dbType: 'postgres' })
    expect(next.draft.name).toBe('custom-db')
  })

  it('dbTypeChanged preserves username and password', () => {
    const state: DbConnectorsState = { ...createDbInitialState(), draft: { ...createDefaultDbDraft(), username: 'admin', password: 'secret' } }
    const next = dbConnectorsReducer(state, { type: 'dbTypeChanged', dbType: 'postgres' })
    expect(next.draft.username).toBe('admin')
    expect(next.draft.password).toBe('secret')
  })

  it('editingLoaded sets draft and editingConnectorName', () => {
    const draft = toDbConnectorDraft(makeDbConnector('prod-mongo'))
    const next = dbConnectorsReducer(createDbInitialState(), {
      type: 'editingLoaded',
      draft,
      editingName: 'prod-mongo',
    })
    expect(next.draft).toBe(draft)
    expect(next.editingConnectorName).toBe('prod-mongo')
    expect(next.isOverwriteConfirmOpen).toBe(false)
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('editingLoaded clears overwrite confirm and pending delete', () => {
    const state: DbConnectorsState = {
      ...createDbInitialState(),
      isOverwriteConfirmOpen: true,
      connectorPendingDelete: makeDbConnector('old'),
    }
    const draft = toDbConnectorDraft(makeDbConnector('new-conn'))
    const next = dbConnectorsReducer(state, { type: 'editingLoaded', draft, editingName: 'new-conn' })
    expect(next.isOverwriteConfirmOpen).toBe(false)
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('startNewConnector resets draft and editing state', () => {
    const state: DbConnectorsState = {
      ...createDbInitialState(),
      editingConnectorName: 'c1',
      isOverwriteConfirmOpen: true,
      connectorPendingDelete: makeDbConnector('c1'),
    }
    const next = dbConnectorsReducer(state, { type: 'startNewConnector' })
    expect(next.editingConnectorName).toBeNull()
    expect(next.isOverwriteConfirmOpen).toBe(false)
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('openOverwriteConfirm / closeOverwriteConfirm toggles flag', () => {
    let state = dbConnectorsReducer(createDbInitialState(), { type: 'openOverwriteConfirm' })
    expect(state.isOverwriteConfirmOpen).toBe(true)
    state = dbConnectorsReducer(state, { type: 'closeOverwriteConfirm' })
    expect(state.isOverwriteConfirmOpen).toBe(false)
  })

  it('submitStart / submitFailed cycle', () => {
    let state = dbConnectorsReducer(createDbInitialState(), { type: 'submitStart' })
    expect(state.isSubmitting).toBe(true)
    state = dbConnectorsReducer(state, { type: 'submitFailed' })
    expect(state.isSubmitting).toBe(false)
  })

  it('submitSuccess sets editing state', () => {
    const next = dbConnectorsReducer(createDbInitialState(), { type: 'submitSuccess', connectorName: 'm1' })
    expect(next.isSubmitting).toBe(false)
    expect(next.editingConnectorName).toBe('m1')
    expect(next.isOverwriteConfirmOpen).toBe(false)
  })

  it('requestDelete sets connectorPendingDelete and closes overwrite', () => {
    const connector = makeDbConnector('m1')
    const state: DbConnectorsState = { ...createDbInitialState(), isOverwriteConfirmOpen: true }
    const next = dbConnectorsReducer(state, { type: 'requestDelete', connector })
    expect(next.connectorPendingDelete).toBe(connector)
    expect(next.isOverwriteConfirmOpen).toBe(false)
  })

  it('requestDeleteEditing finds connector by editingConnectorName', () => {
    const connector = makeDbConnector('m1')
    const state: DbConnectorsState = { ...createDbInitialState(), connectors: [connector], editingConnectorName: 'm1' }
    const next = dbConnectorsReducer(state, { type: 'requestDeleteEditing' })
    expect(next.connectorPendingDelete).toBe(connector)
  })

  it('requestDeleteEditing no-ops if editingConnectorName not found', () => {
    const state: DbConnectorsState = { ...createDbInitialState(), editingConnectorName: 'nonexistent' }
    const next = dbConnectorsReducer(state, { type: 'requestDeleteEditing' })
    expect(next).toBe(state)
  })

  it('deleteSuccess resets draft when editing deleted connector', () => {
    const state: DbConnectorsState = { ...createDbInitialState(), editingConnectorName: 'm1', isSubmitting: true }
    const next = dbConnectorsReducer(state, { type: 'deleteSuccess', deletedName: 'm1', deletedType: 'mongodb' })
    expect(next.editingConnectorName).toBeNull()
    expect(next.isSubmitting).toBe(false)
    expect(next.draft.name).toBe('local-mongo')
  })

  it('deleteSuccess only clears pending when not editing', () => {
    const connector = makeDbConnector('m2')
    const state: DbConnectorsState = { ...createDbInitialState(), connectorPendingDelete: connector, editingConnectorName: 'm1', isSubmitting: true }
    const next = dbConnectorsReducer(state, { type: 'deleteSuccess', deletedName: 'm2', deletedType: 'mongodb' })
    expect(next.editingConnectorName).toBe('m1')
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('closeDeleteModal clears connectorPendingDelete', () => {
    const connector = makeDbConnector('m1')
    const state: DbConnectorsState = { ...createDbInitialState(), connectorPendingDelete: connector }
    const next = dbConnectorsReducer(state, { type: 'closeDeleteModal' })
    expect(next.connectorPendingDelete).toBeNull()
  })

  it('deleteFailed clears isSubmitting', () => {
    const state: DbConnectorsState = { ...createDbInitialState(), isSubmitting: true }
    const next = dbConnectorsReducer(state, { type: 'deleteFailed' })
    expect(next.isSubmitting).toBe(false)
  })

  it('unknown action returns same state', () => {
    const state = createDbInitialState()
    // @ts-expect-error — testing default branch
    const next = dbConnectorsReducer(state, { type: 'nonexistent' })
    expect(next).toBe(state)
  })
})
