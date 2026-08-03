// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../../state/MessageDispatch.reducer'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import type { SingleRequestPayload } from '../../../../services/message-dispatch.service'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../../../core/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('../../../../services/message-dispatch.service', () => ({
  createCollection: vi.fn(),
  createSingleRequest: vi.fn(),
  deleteSingleRequestByName: vi.fn(),
  getSingleRequestByName: vi.fn(),
  patchSingleRequest: vi.fn(),
}))

import { toast } from 'sonner'
import {
  createCollection,
  createSingleRequest,
  deleteSingleRequestByName,
  getSingleRequestByName,
  patchSingleRequest,
} from '../../../../services/message-dispatch.service'
import { useDispatchSingleRequestActions } from './useDispatchSingleRequestActions'

const createCollectionMock = createCollection as unknown as Mock
const createSingleRequestMock = createSingleRequest as unknown as Mock
const deleteSingleRequestByNameMock = deleteSingleRequestByName as unknown as Mock
const getSingleRequestByNameMock = getSingleRequestByName as unknown as Mock
const patchSingleRequestMock = patchSingleRequest as unknown as Mock
const toastErrorMock = toast.error as unknown as Mock
const toastSuccessMock = toast.success as unknown as Mock

const req = (overrides: Partial<SingleRequestPayload> = {}): SingleRequestPayload => ({
  singleRequestName: 'req-a',
  collectionName: 'col-a',
  messageType: 'kafka',
  contentType: 'application/json',
  producerName: 'p1',
  topic: 'topic-a',
  exchange: null,
  routingKey: null,
  executions: 1,
  stage: null,
  event: null,
  state: {},
  key: null,
  headers: {},
  wireFormat: { type: 'none' },
  workflowState: {},
  protoSchema: null,
  ...overrides,
})

let container: HTMLDivElement | null = null
let root: Root | null = null
let dispatchLog: MessageDispatchAction[] = []
let stateRef: { current: MessageDispatchState }
let actions: ReturnType<typeof useDispatchSingleRequestActions>
const refreshCollections = vi.fn(async () => {})
const buildSingleRequestPayload = vi.fn((name: string, collectionName: string) => req({ singleRequestName: name, collectionName }))

function dispatch(action: MessageDispatchAction) {
  dispatchLog.push(action)
}

function Probe() {
  actions = useDispatchSingleRequestActions({
    dispatch,
    stateRef,
    refreshCollections,
    buildSingleRequestPayload,
  })
  return null
}

function mount(stateOverrides: Partial<MessageDispatchState> = {}) {
  stateRef = { current: { ...createInitialState(), ...stateOverrides } }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<Probe />))
}

beforeEach(() => {
  dispatchLog = []
  createCollectionMock.mockReset()
  createSingleRequestMock.mockReset()
  deleteSingleRequestByNameMock.mockReset()
  getSingleRequestByNameMock.mockReset()
  patchSingleRequestMock.mockReset()
  toastErrorMock.mockReset()
  toastSuccessMock.mockReset()
  refreshCollections.mockClear()
  buildSingleRequestPayload.mockClear()
})

// -- saveSingleRequestWithValues ------------------------------------------------

describe('saveSingleRequestWithValues', () => {
  it('fails fast when the request name is blank', async () => {
    mount()
    const result = await actions.saveSingleRequestWithValues('col', '   ')
    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalled()
    expect(createCollectionMock).not.toHaveBeenCalled()
  })

  it('falls back to the default collection when none is given', async () => {
    createSingleRequestMock.mockResolvedValue(req({ collectionName: 'Uncategorized' }))
    mount({ collections: [] })
    await actions.saveSingleRequestWithValues('   ', 'req-a')
    expect(createCollectionMock).toHaveBeenCalledWith('Uncategorized')
  })

  it('skips creating the collection when it already exists', async () => {
    createSingleRequestMock.mockResolvedValue(req())
    mount({ collections: [{ collectionName: 'col-a', collectionContext: {} }] })
    await actions.saveSingleRequestWithValues('col-a', 'req-a')
    expect(createCollectionMock).not.toHaveBeenCalled()
  })

  it('patches an existing single request instead of creating a new one', async () => {
    const existing = req()
    patchSingleRequestMock.mockResolvedValue(existing)
    mount({ collections: [{ collectionName: 'col-a', collectionContext: {} }], singleRequests: [existing] })

    const result = await actions.saveSingleRequestWithValues('col-a', 'req-a')

    expect(result).toBe(true)
    expect(patchSingleRequestMock).toHaveBeenCalledWith('req-a', expect.any(Object))
    expect(createSingleRequestMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.vm.singleRequestUpdated'))
    expect(dispatchLog.map((a) => a.type)).toEqual(
      expect.arrayContaining(['savingSingleRequestStarted', 'collectionSelected', 'singleRequestSelected', 'singleRequestNameChanged', 'savingSingleRequestCompleted']),
    )
    expect(refreshCollections).toHaveBeenCalledWith(false)
  })

  it('creates a new single request when none exists yet', async () => {
    createSingleRequestMock.mockResolvedValue(req())
    mount({ collections: [{ collectionName: 'col-a', collectionContext: {} }], singleRequests: [] })

    const result = await actions.saveSingleRequestWithValues('col-a', 'req-a')

    expect(result).toBe(true)
    expect(createSingleRequestMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.vm.singleRequestCreated'))
  })

  it('reports a failure and still completes the saving flag when the API rejects', async () => {
    createSingleRequestMock.mockRejectedValue(new Error('network down'))
    mount({ collections: [{ collectionName: 'col-a', collectionContext: {} }] })

    const result = await actions.saveSingleRequestWithValues('col-a', 'req-a')

    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalledWith('network down')
    expect(dispatchLog.at(-1)?.type).toBe('savingSingleRequestCompleted')
  })
})

describe('saveCurrentAsSingleRequest', () => {
  it('prefers the tab source collection and selected request name', async () => {
    createSingleRequestMock.mockResolvedValue(req())
    mount({
      collections: [{ collectionName: 'source-col', collectionContext: {} }],
      loadedSingleRequestCollectionName: 'source-col',
      selectedCollectionName: 'other-col',
      selectedSingleRequestName: 'req-a',
      singleRequestNameRaw: 'ignored',
    })

    await actions.saveCurrentAsSingleRequest()

    expect(buildSingleRequestPayload).toHaveBeenCalledWith('req-a', 'source-col')
  })

  it('falls back to selectedCollectionName and singleRequestNameRaw when unset', async () => {
    createSingleRequestMock.mockResolvedValue(req())
    mount({
      collections: [{ collectionName: 'other-col', collectionContext: {} }],
      loadedSingleRequestCollectionName: null,
      selectedCollectionName: 'other-col',
      selectedSingleRequestName: null,
      singleRequestNameRaw: 'draft-name',
    })

    await actions.saveCurrentAsSingleRequest()

    expect(buildSingleRequestPayload).toHaveBeenCalledWith('draft-name', 'other-col')
  })
})

// -- renameSingleRequest ---------------------------------------------------------

describe('renameSingleRequest', () => {
  it('is a no-op when collectionName or currentName is blank', async () => {
    mount()
    expect(await actions.renameSingleRequest('', 'req-a', 'req-b')).toBe(false)
    expect(await actions.renameSingleRequest('col', '', 'req-b')).toBe(false)
    expect(dispatchLog).toEqual([])
  })

  it('fails when the next name is blank', async () => {
    mount()
    const result = await actions.renameSingleRequest('col', 'req-a', '  ')
    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('returns true immediately when the name is unchanged', async () => {
    mount()
    const result = await actions.renameSingleRequest('col', 'req-a', 'req-a')
    expect(result).toBe(true)
    expect(dispatchLog).toEqual([])
  })

  it('fails when the next name already exists in the collection', async () => {
    mount({ singleRequests: [req({ singleRequestName: 'req-b', collectionName: 'col' })] })
    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')
    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.vm.singleRequestAlreadyExistsInCollection'))
  })

  it('renames using a locally-known source and updates selection when it matches', async () => {
    const source = req({ singleRequestName: 'req-a', collectionName: 'col' })
    createSingleRequestMock.mockResolvedValue(req({ singleRequestName: 'req-b', collectionName: 'col' }))
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({
      singleRequests: [source],
      selectedSingleRequestName: 'req-a',
      loadedSingleRequestCollectionName: 'col',
    })

    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(result).toBe(true)
    expect(getSingleRequestByNameMock).not.toHaveBeenCalled()
    expect(createSingleRequestMock).toHaveBeenCalledWith(expect.objectContaining({ singleRequestName: 'req-b', collectionName: 'col' }))
    expect(deleteSingleRequestByNameMock).toHaveBeenCalledWith('req-a')
    expect(dispatchLog.map((a) => a.type)).toEqual(
      expect.arrayContaining(['singleRequestSelected', 'singleRequestNameChanged']),
    )
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(refreshCollections).toHaveBeenCalledWith(false)
  })

  it('skips selection dispatches when the renamed request is not the active selection', async () => {
    const source = req({ singleRequestName: 'req-a', collectionName: 'col' })
    createSingleRequestMock.mockResolvedValue(req({ singleRequestName: 'req-b', collectionName: 'col' }))
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({
      singleRequests: [source],
      selectedSingleRequestName: 'someone-else',
      loadedSingleRequestCollectionName: 'col',
    })

    await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(dispatchLog.map((a) => a.type)).not.toContain('singleRequestSelected')
  })

  it('fetches the source remotely when it is not in the local catalog', async () => {
    getSingleRequestByNameMock.mockResolvedValue(req({ singleRequestName: 'req-a', collectionName: 'col' }))
    createSingleRequestMock.mockResolvedValue(req({ singleRequestName: 'req-b', collectionName: 'col' }))
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({ singleRequests: [] })

    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(result).toBe(true)
    expect(getSingleRequestByNameMock).toHaveBeenCalledWith('req-a')
  })

  it('fails when the remote source is missing or belongs to a different collection', async () => {
    getSingleRequestByNameMock.mockResolvedValue(null)
    mount({ singleRequests: [] })

    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('rolls back the created entry when deleting the old one fails, then reports failure', async () => {
    const source = req({ singleRequestName: 'req-a', collectionName: 'col' })
    createSingleRequestMock.mockResolvedValue(req({ singleRequestName: 'req-b', collectionName: 'col' }))
    deleteSingleRequestByNameMock.mockRejectedValueOnce(new Error('cannot delete old')).mockResolvedValueOnce(undefined)
    mount({ singleRequests: [source] })

    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(result).toBe(false)
    expect(deleteSingleRequestByNameMock).toHaveBeenNthCalledWith(1, 'req-a')
    expect(deleteSingleRequestByNameMock).toHaveBeenNthCalledWith(2, 'req-b')
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.vm.singleRequestRenameFailed'))
  })

  it('still reports failure when the rollback deletion itself fails', async () => {
    const source = req({ singleRequestName: 'req-a', collectionName: 'col' })
    createSingleRequestMock.mockResolvedValue(req({ singleRequestName: 'req-b', collectionName: 'col' }))
    deleteSingleRequestByNameMock.mockRejectedValue(new Error('always fails'))
    mount({ singleRequests: [source] })

    const result = await actions.renameSingleRequest('col', 'req-a', 'req-b')

    expect(result).toBe(false)
    expect(toastErrorMock).toHaveBeenCalled()
  })
})

// -- doesSingleRequestExist -------------------------------------------------------

describe('doesSingleRequestExist', () => {
  it('returns false for blank inputs', () => {
    mount()
    expect(actions.doesSingleRequestExist('', 'req-a')).toBe(false)
    expect(actions.doesSingleRequestExist('col', '')).toBe(false)
  })

  it('returns true only when an entry matches both collection and name', () => {
    mount({ singleRequests: [req({ singleRequestName: 'req-a', collectionName: 'col' })] })
    expect(actions.doesSingleRequestExist('col', 'req-a')).toBe(true)
    expect(actions.doesSingleRequestExist('other', 'req-a')).toBe(false)
  })
})

// -- loadSingleRequest --------------------------------------------------------------

describe('loadSingleRequest', () => {
  it('is a no-op for a blank name', async () => {
    mount()
    await actions.loadSingleRequest('   ')
    expect(dispatchLog).toEqual([])
    expect(getSingleRequestByNameMock).not.toHaveBeenCalled()
  })

  it('opens a local match in a new tab without hitting the network', async () => {
    const local = req({ singleRequestName: 'req-a', collectionName: 'col' })
    mount({ singleRequests: [local] })

    await actions.loadSingleRequest('req-a')

    expect(getSingleRequestByNameMock).not.toHaveBeenCalled()
    expect(dispatchLog).toEqual([
      { type: 'tabOpenedFromSavedRequest', ref: { collectionName: 'col', singleRequestName: 'req-a' } },
    ])
  })

  it('falls back to the selected-collection match when the requested collection has no direct hit', async () => {
    const fallback = req({ singleRequestName: 'req-a', collectionName: 'selected-col' })
    mount({ singleRequests: [fallback], selectedCollectionName: 'selected-col' })

    await actions.loadSingleRequest('req-a', 'other-col')

    expect(dispatchLog).toEqual([
      { type: 'tabOpenedFromSavedRequest', ref: { collectionName: 'selected-col', singleRequestName: 'req-a' } },
    ])
  })

  it('fetches remotely, adds to the catalog, and opens a new tab when not found locally', async () => {
    const loaded = req({ singleRequestName: 'req-a', collectionName: 'col' })
    getSingleRequestByNameMock.mockResolvedValue(loaded)
    mount({ singleRequests: [] })

    await actions.loadSingleRequest('req-a')

    expect(dispatchLog).toEqual([
      { type: 'singleRequestsLoaded', requests: [loaded] },
      { type: 'tabOpenedFromSavedRequest', ref: { collectionName: 'col', singleRequestName: 'req-a' } },
    ])
  })

  it('does not duplicate the catalog entry when it is already present', async () => {
    const loaded = req({ singleRequestName: 'req-a', collectionName: 'col' })
    getSingleRequestByNameMock.mockResolvedValue(loaded)
    mount({ singleRequests: [loaded] })

    await actions.loadSingleRequest('req-a', 'no-match-collection')

    expect(dispatchLog.map((a) => a.type)).toEqual(['tabOpenedFromSavedRequest'])
  })

  it('reports failure when the remote request is missing', async () => {
    getSingleRequestByNameMock.mockResolvedValue(null)
    mount({ singleRequests: [] })

    await actions.loadSingleRequest('req-a')

    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.vm.singleRequestNotFound'))
  })

  it('reports failure when the remote fetch rejects', async () => {
    getSingleRequestByNameMock.mockRejectedValue(new Error('offline'))
    mount({ singleRequests: [] })

    await actions.loadSingleRequest('req-a')

    expect(toastErrorMock).toHaveBeenCalledWith('offline')
  })
})

// -- deleteSingleRequest --------------------------------------------------------------

describe('deleteSingleRequest', () => {
  it('is a no-op for a blank name', async () => {
    mount()
    await actions.deleteSingleRequest('  ')
    expect(deleteSingleRequestByNameMock).not.toHaveBeenCalled()
  })

  it('clears the loaded selection when the deleted request was active', async () => {
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({ selectedSingleRequestName: 'req-a', loadedSingleRequestCollectionName: 'col' })

    await actions.deleteSingleRequest('req-a', 'col')

    expect(dispatchLog).toEqual([{ type: 'loadedSelectionCleared' }])
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(refreshCollections).toHaveBeenCalledWith(false)
  })

  it('does not clear selection when the deleted request was not active', async () => {
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({ selectedSingleRequestName: 'some-other-req' })

    await actions.deleteSingleRequest('req-a')

    expect(dispatchLog).toEqual([])
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('does not clear selection when the collection filter does not match', async () => {
    deleteSingleRequestByNameMock.mockResolvedValue(undefined)
    mount({ selectedSingleRequestName: 'req-a', loadedSingleRequestCollectionName: 'col' })

    await actions.deleteSingleRequest('req-a', 'other-col')

    expect(dispatchLog).toEqual([])
  })

  it('reports failure when the delete call rejects', async () => {
    deleteSingleRequestByNameMock.mockRejectedValue(new Error('locked'))
    mount()

    await actions.deleteSingleRequest('req-a')

    expect(toastErrorMock).toHaveBeenCalledWith('locked')
    expect(refreshCollections).not.toHaveBeenCalled()
  })
})
