// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../state/MessageDispatch.reducer'
import type { MessageDispatchAction, MessageDispatchState } from '../state/MessageDispatch.types'
import type { DispatchTab } from '../state/MessageDispatch.tabs'
import type { SingleRequestPayload } from '../../../services/message-dispatch.service'
import { useDispatchTabHydration } from './useDispatchTabHydration'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const req = (overrides: Partial<SingleRequestPayload> = {}): SingleRequestPayload => ({
  singleRequestName: 'req-a',
  collectionName: 'col-a',
  messageType: 'kafka',
  contentType: 'application/json',
  producerName: 'p1',
  topic: null,
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

const savedTab = (overrides: Partial<DispatchTab> = {}): DispatchTab => ({
  id: 'tab-1',
  savedRequestRef: { collectionName: 'col-a', singleRequestName: 'req-a' },
  formSnapshot: null,
  activeHistoryRef: null,
  title: 'req-a',
  order: 0,
  ...overrides,
})

let container: HTMLDivElement | null = null
let root: Root | null = null
let dispatchLog: MessageDispatchAction[] = []
const loadSingleRequestToDispatch = vi.fn()

function dispatch(action: MessageDispatchAction) {
  dispatchLog.push(action)
}

function Probe({ state }: { state: MessageDispatchState }) {
  useDispatchTabHydration(state, dispatch, loadSingleRequestToDispatch)
  return null
}

function render(state: MessageDispatchState) {
  if (!root) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  act(() => root?.render(<Probe state={state} />))
}

beforeEach(() => {
  dispatchLog = []
  loadSingleRequestToDispatch.mockReset()
  container?.remove()
  container = null
  root = null
})

it('does nothing when there is no active tab', () => {
  render({ ...createInitialState(), tabs: [], activeTabId: null })
  expect(loadSingleRequestToDispatch).not.toHaveBeenCalled()
})

it('does nothing when the active tab has no saved-request ref', () => {
  const tab = savedTab({ savedRequestRef: null })
  render({ ...createInitialState(), tabs: [tab], activeTabId: tab.id })
  expect(loadSingleRequestToDispatch).not.toHaveBeenCalled()
})

it('does nothing when the active tab already has a form snapshot', () => {
  const tab = savedTab({ formSnapshot: { ...createInitialState(), tabs: [], activeTabId: null } as never })
  render({ ...createInitialState(), tabs: [tab], activeTabId: tab.id })
  expect(loadSingleRequestToDispatch).not.toHaveBeenCalled()
})

it('does nothing when the referenced request is not in the catalog yet', () => {
  const tab = savedTab()
  render({ ...createInitialState(), tabs: [tab], activeTabId: tab.id, singleRequests: [] })
  expect(loadSingleRequestToDispatch).not.toHaveBeenCalled()
})

it('hydrates silently and syncs selection state when the request is found', () => {
  const tab = savedTab()
  const entry = req()
  render({ ...createInitialState(), tabs: [tab], activeTabId: tab.id, singleRequests: [entry] })

  expect(loadSingleRequestToDispatch).toHaveBeenCalledWith(entry, { silent: true })
  expect(dispatchLog).toEqual([
    { type: 'collectionSelected', name: 'col-a' },
    { type: 'singleRequestSelected', name: 'req-a', collectionName: 'col-a' },
    { type: 'singleRequestNameChanged', value: 'req-a' },
  ])
})

it('hydrates only once per tab even if the effect re-runs with the same inputs', () => {
  const tab = savedTab()
  const entry = req()
  const state = { ...createInitialState(), tabs: [tab], activeTabId: tab.id, singleRequests: [entry] }
  render(state)
  render({ ...state })

  expect(loadSingleRequestToDispatch).toHaveBeenCalledTimes(1)
})

it('re-hydrates a different tab once it becomes active', () => {
  const tabA = savedTab({ id: 'tab-a', savedRequestRef: { collectionName: 'col-a', singleRequestName: 'req-a' } })
  const tabB = savedTab({
    id: 'tab-b',
    savedRequestRef: { collectionName: 'col-b', singleRequestName: 'req-b' },
    title: 'req-b',
    order: 1,
  })
  const entryA = req()
  const entryB = req({ singleRequestName: 'req-b', collectionName: 'col-b' })

  render({ ...createInitialState(), tabs: [tabA, tabB], activeTabId: tabA.id, singleRequests: [entryA, entryB] })
  render({ ...createInitialState(), tabs: [tabA, tabB], activeTabId: tabB.id, singleRequests: [entryA, entryB] })

  expect(loadSingleRequestToDispatch).toHaveBeenCalledTimes(2)
  expect(loadSingleRequestToDispatch).toHaveBeenNthCalledWith(1, entryA, { silent: true })
  expect(loadSingleRequestToDispatch).toHaveBeenNthCalledWith(2, entryB, { silent: true })
})
