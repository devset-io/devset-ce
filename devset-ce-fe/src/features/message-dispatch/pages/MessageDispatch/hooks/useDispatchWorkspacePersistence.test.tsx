// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../state/MessageDispatch.reducer'
import type { MessageDispatchAction, MessageDispatchState } from '../state/MessageDispatch.types'
import type { DispatchTab } from '../state/MessageDispatch.tabs'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../services/dispatchWorkspace.repository', () => ({
  createLocalStorageWorkspaceRepository: vi.fn(),
  createHybridWorkspaceRepository: vi.fn(),
  createApiWorkspaceRepository: vi.fn(),
}))

vi.mock('../state/MessageDispatch.tabs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state/MessageDispatch.tabs')>()
  return {
    ...actual,
    serializeWorkspace: vi.fn(() => ({ activeTabId: 'marker', tabs: [] })),
  }
})

import {
  createApiWorkspaceRepository,
  createHybridWorkspaceRepository,
  createLocalStorageWorkspaceRepository,
} from '../../../services/dispatchWorkspace.repository'
import { serializeWorkspace } from '../state/MessageDispatch.tabs'
import { useDispatchWorkspacePersistence } from './useDispatchWorkspacePersistence'

const createLocalStorageWorkspaceRepositoryMock = createLocalStorageWorkspaceRepository as unknown as Mock
const createHybridWorkspaceRepositoryMock = createHybridWorkspaceRepository as unknown as Mock
const createApiWorkspaceRepositoryMock = createApiWorkspaceRepository as unknown as Mock
const serializeWorkspaceMock = serializeWorkspace as unknown as Mock

const tab = (id: string): DispatchTab => ({
  id,
  savedRequestRef: null,
  formSnapshot: null,
  activeHistoryRef: null,
  title: id,
  order: 0,
})

let localMock: { load: Mock; save: Mock }
let hybridMock: { load: Mock; save: Mock }
let container: HTMLDivElement | null = null
let root: Root | null = null
let dispatchLog: MessageDispatchAction[] = []
let stateRef: { current: MessageDispatchState }

function dispatch(action: MessageDispatchAction) {
  dispatchLog.push(action)
}

function Probe({ state }: { state: MessageDispatchState }) {
  useDispatchWorkspacePersistence(state, dispatch, stateRef)
  return null
}

function mount(state: MessageDispatchState) {
  stateRef = { current: state }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<Probe state={state} />))
}

function rerender(state: MessageDispatchState) {
  stateRef.current = state
  act(() => root?.render(<Probe state={state} />))
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  dispatchLog = []
  localMock = { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) }
  hybridMock = { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) }
  createLocalStorageWorkspaceRepositoryMock.mockReset().mockReturnValue(localMock)
  createHybridWorkspaceRepositoryMock.mockReset().mockReturnValue(hybridMock)
  createApiWorkspaceRepositoryMock.mockReset().mockReturnValue({})
  serializeWorkspaceMock.mockClear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
  vi.useRealTimers()
})

describe('initial hydration', () => {
  it('dispatches tabsHydrated when localStorage has tabs', async () => {
    localMock.load.mockResolvedValue({ activeTabId: 'tab-a', tabs: [tab('tab-a')] })
    mount(createInitialState())
    await flushMicrotasks()
    expect(dispatchLog).toContainEqual({ type: 'tabsHydrated', tabs: [tab('tab-a')], activeTabId: 'tab-a' })
  })

  it('skips the dispatch when localStorage resolves an empty tab list', async () => {
    localMock.load.mockResolvedValue({ activeTabId: null, tabs: [] })
    mount(createInitialState())
    await flushMicrotasks()
    expect(dispatchLog.some((a) => a.type === 'tabsHydrated')).toBe(false)
  })

  it('skips the dispatch when localStorage resolves null', async () => {
    localMock.load.mockResolvedValue(null)
    mount(createInitialState())
    await flushMicrotasks()
    expect(dispatchLog.some((a) => a.type === 'tabsHydrated')).toBe(false)
  })

  it('swallows a localStorage load rejection', async () => {
    localMock.load.mockRejectedValue(new Error('boom'))
    expect(() => mount(createInitialState())).not.toThrow()
    await flushMicrotasks()
    expect(dispatchLog.some((a) => a.type === 'tabsHydrated')).toBe(false)
  })

  it('dispatches serverTabsMerged when the full merge resolves with tabs', async () => {
    hybridMock.load.mockResolvedValue({ activeTabId: 'tab-b', tabs: [tab('tab-b')] })
    mount(createInitialState())
    await flushMicrotasks()
    expect(dispatchLog).toContainEqual({ type: 'serverTabsMerged', tabs: [tab('tab-b')] })
  })

  it('does not dispatch serverTabsMerged when the merge resolves null', async () => {
    hybridMock.load.mockResolvedValue(null)
    mount(createInitialState())
    await flushMicrotasks()
    expect(dispatchLog.some((a) => a.type === 'serverTabsMerged')).toBe(false)
  })

  it('swallows a merge-load rejection without throwing', async () => {
    hybridMock.load.mockRejectedValue(new Error('offline'))
    expect(() => mount(createInitialState())).not.toThrow()
    await flushMicrotasks()
    expect(dispatchLog.some((a) => a.type === 'serverTabsMerged')).toBe(false)
  })
})

describe('debounced save', () => {
  it('does not save before the initial hydration settles', async () => {
    hybridMock.load.mockReturnValue(new Promise(() => {})) // never resolves
    vi.useFakeTimers()
    mount(createInitialState())
    rerender({ ...createInitialState(), topicRaw: 'orders' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(hybridMock.save).not.toHaveBeenCalled()
  })

  it('saves the serialized workspace after the debounce window once hydrated', async () => {
    vi.useFakeTimers()
    mount(createInitialState())
    await flushMicrotasks()

    rerender({ ...createInitialState(), topicRaw: 'orders' })
    await vi.advanceTimersByTimeAsync(400)

    expect(hybridMock.save).toHaveBeenCalledTimes(1)
    expect(serializeWorkspaceMock).toHaveBeenCalledWith(stateRef.current)
  })

  it('collapses rapid state changes into a single save', async () => {
    vi.useFakeTimers()
    mount(createInitialState())
    await flushMicrotasks()

    rerender({ ...createInitialState(), topicRaw: 'first' })
    await vi.advanceTimersByTimeAsync(100)
    rerender({ ...createInitialState(), topicRaw: 'second' })
    await vi.advanceTimersByTimeAsync(400)

    expect(hybridMock.save).toHaveBeenCalledTimes(1)
  })

  it('swallows a save rejection', async () => {
    hybridMock.save.mockRejectedValue(new Error('save failed'))
    vi.useFakeTimers()
    mount(createInitialState())
    await flushMicrotasks()

    rerender({ ...createInitialState(), topicRaw: 'orders' })
    await expect(vi.advanceTimersByTimeAsync(400)).resolves.not.toThrow()
  })
})

describe('flush on beforeunload / unmount', () => {
  it('flushes a pending save immediately on beforeunload', async () => {
    vi.useFakeTimers()
    mount(createInitialState())
    await flushMicrotasks()

    rerender({ ...createInitialState(), topicRaw: 'orders' })
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'))
      await Promise.resolve()
    })

    expect(hybridMock.save).toHaveBeenCalledTimes(1)
  })

  it('flushes a pending save on unmount', async () => {
    vi.useFakeTimers()
    mount(createInitialState())
    await flushMicrotasks()

    rerender({ ...createInitialState(), topicRaw: 'orders' })
    await act(async () => {
      root?.unmount()
      root = null
      await Promise.resolve()
    })

    expect(hybridMock.save).toHaveBeenCalledTimes(1)
  })
})
