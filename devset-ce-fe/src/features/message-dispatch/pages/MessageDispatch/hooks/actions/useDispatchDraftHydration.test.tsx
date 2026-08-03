// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../../state/MessageDispatch.reducer'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import type { SingleRequestPayload, SingleStepHistoryEntry } from '../../../../services/message-dispatch.service'
import type { RepoProtoSchema } from '../../../../types'
import type { ConnectorStatus } from '../../../../../../shared/services/kafka-connectors.service'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../../../core/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}))

vi.mock('../../../../../../shared/services/kafka-connectors.service', () => ({
  setActiveConnector: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), success: vi.fn() },
}))

import { toast } from 'sonner'
import { setActiveConnector } from '../../../../../../shared/services/kafka-connectors.service'
import { useDispatchDraftHydration } from './useDispatchDraftHydration'

const setActiveConnectorMock = setActiveConnector as unknown as Mock
const toastWarningMock = toast.warning as unknown as Mock
const toastSuccessMock = toast.success as unknown as Mock

const connector = (overrides: Partial<ConnectorStatus> = {}): ConnectorStatus => ({
  name: 'producer-a',
  type: 'kafka',
  endpoint: 'localhost:9092',
  producerConnected: true,
  consumerConnected: true,
  authenticated: true,
  ...overrides,
})

const historyEntry = (overrides: Partial<SingleStepHistoryEntry> = {}): SingleStepHistoryEntry => ({
  id: 'hist-1',
  createdAtEpochMillis: 0,
  runId: 'run-1',
  workflowId: 'wf-1',
  messageType: 'kafka',
  contentType: 'application/json',
  producerName: 'producer-a',
  topic: 'orders',
  key: 'order-key',
  exchange: null,
  routingKey: null,
  executions: 3,
  stage: 'stage-1',
  event: 'event-1',
  state: { a: 1 },
  headers: { 'X-Trace': 'abc' },
  workflowState: {},
  schemaId: null,
  protoSchema: null,
  protobufRootMessage: null,
  ...overrides,
})

const singleRequest = (overrides: Partial<SingleRequestPayload> = {}): SingleRequestPayload => ({
  singleRequestName: 'req-a',
  collectionName: 'col-a',
  messageType: 'kafka',
  contentType: 'application/json',
  producerName: 'producer-a',
  topic: 'orders',
  exchange: null,
  routingKey: null,
  executions: 2,
  stage: null,
  event: null,
  state: { b: 2 },
  key: 'literal-key',
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
let actions: ReturnType<typeof useDispatchDraftHydration>
const findRepoProtoSchema = vi.fn((_id: string): RepoProtoSchema | null => null)

function dispatch(action: MessageDispatchAction) {
  dispatchLog.push(action)
}

function Probe() {
  actions = useDispatchDraftHydration({ dispatch, stateRef, findRepoProtoSchema })
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
  setActiveConnectorMock.mockReset()
  toastWarningMock.mockReset()
  toastSuccessMock.mockReset()
  findRepoProtoSchema.mockReset().mockReturnValue(null)
})

describe('loadHistoryEntryToDispatch', () => {
  it('activates the connector and shows a success toast when it exists', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(historyEntry())

    expect(setActiveConnectorMock).toHaveBeenCalledWith('producer-a')
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.execution.loadedHistoryEntry'))
    expect(toastWarningMock).not.toHaveBeenCalled()
  })

  it('warns instead of succeeding when the connector no longer exists', () => {
    mount({ connectors: [] })

    actions.loadHistoryEntryToDispatch(historyEntry())

    expect(setActiveConnectorMock).not.toHaveBeenCalled()
    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.execution.connectorMissing'))
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('dispatches a draftHydratedFromHistory patch with the mapped fields', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(historyEntry())

    expect(dispatchLog).toHaveLength(1)
    const action = dispatchLog[0]
    expect(action.type).toBe('draftHydratedFromHistory')
    if (action.type !== 'draftHydratedFromHistory') throw new Error('unreachable')
    expect(action.patch).toMatchObject({
      selectedConnectorName: 'producer-a',
      contentMode: 'json',
      topicRaw: 'orders',
      kafkaKeyRaw: 'order-key',
      kafkaKeyKind: 'literal',
      stepStateRaw: JSON.stringify({ a: 1 }, null, 2),
      loadedFromHistoryId: 'hist-1',
    })
    expect(action.patch.loadedHistoryMetadata).toMatchObject({
      workflowId: 'wf-1',
      executions: 3,
      stage: 'stage-1',
      event: 'event-1',
    })
  })

  it('falls back to default stage/event and empty strings for nullish fields', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(historyEntry({ stage: '', event: '', topic: null, routingKey: null, exchange: null, key: null }))

    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromHistory') throw new Error('unreachable')
    expect(action.patch.topicRaw).toBe('')
    expect(action.patch.kafkaKeyRaw).toBe('')
    expect(action.patch.loadedHistoryMetadata?.stage).toBe('single-step')
    expect(action.patch.loadedHistoryMetadata?.event).toBe('single-step-event')
  })

  it('marks protobuf entries with a resolvable schema as applied', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(
      historyEntry({ contentType: 'application/x-protobuf', protoSchema: 'message Foo {}', schemaId: 'schema-1' }),
    )

    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromHistory') throw new Error('unreachable')
    expect(action.patch.contentMode).toBe('protobuf')
    expect(action.patch.isProtoBaseApplied).toBe(true)
    expect(toastWarningMock).not.toHaveBeenCalledWith(expect.stringContaining('protobufHistoryMissingSchema'))
  })

  it('warns when a protobuf entry has no resolvable schema anywhere', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(
      historyEntry({ contentType: 'application/x-protobuf', protoSchema: null, schemaId: 'schema-1' }),
    )

    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.execution.protobufHistoryMissingSchema'))
  })

  it('applies a binary-prefix wire format only for protobuf entries', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(
      historyEntry({
        contentType: 'application/x-protobuf',
        protoSchema: 'x',
        wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 9 } },
      }),
    )

    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromHistory') throw new Error('unreachable')
    expect(action.patch.wireFormatEnabled).toBe(true)
    expect(action.patch.wireFormatPrefixValue).toBe('9')
  })

  it('ignores wire format for non-protobuf entries even if present', () => {
    mount({ connectors: [connector()] })

    actions.loadHistoryEntryToDispatch(
      historyEntry({
        contentType: 'application/json',
        wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 9 } },
      }),
    )

    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromHistory') throw new Error('unreachable')
    expect(action.patch.wireFormatEnabled).toBe(false)
  })
})

describe('loadSingleRequestToDispatch', () => {
  it('dispatches a draftHydratedFromSavedRequest patch and shows a success toast', () => {
    mount({ connectors: [connector()] })

    actions.loadSingleRequestToDispatch(singleRequest())

    expect(dispatchLog).toHaveLength(1)
    const action = dispatchLog[0]
    expect(action.type).toBe('draftHydratedFromSavedRequest')
    if (action.type !== 'draftHydratedFromSavedRequest') throw new Error('unreachable')
    expect(action.patch.selectedConnectorName).toBe('producer-a')
    expect(action.patch.kafkaKeyRaw).toBe('literal-key')
    expect(action.patch.kafkaKeyKind).toBe('literal')
    expect(action.patch.loadedFromHistoryId).toBeNull()
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.execution.loadedSingleRequest'))
  })

  it('parses a $ref DSL key object', () => {
    mount()
    actions.loadSingleRequestToDispatch(singleRequest({ key: { $ref: 'orderId' } }))
    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromSavedRequest') throw new Error('unreachable')
    expect(action.patch.kafkaKeyKind).toBe('ref')
    expect(action.patch.kafkaKeyRaw).toBe('orderId')
  })

  it('warns instead of succeeding when the connector is missing', () => {
    mount({ connectors: [] })
    actions.loadSingleRequestToDispatch(singleRequest())
    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('dispatch.execution.connectorMissing'))
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('suppresses all toasts when silent is true, even with a missing connector', () => {
    mount({ connectors: [] })
    actions.loadSingleRequestToDispatch(singleRequest(), { silent: true })
    expect(toastWarningMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(dispatchLog).toHaveLength(1)
  })

  it('applies the saved wire format only for protobuf requests with a non-none format', () => {
    mount({ connectors: [connector()] })
    actions.loadSingleRequestToDispatch(
      singleRequest({
        contentType: 'application/x-protobuf',
        protoSchema: 'x',
        wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 5 } },
      }),
    )
    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromSavedRequest') throw new Error('unreachable')
    expect(action.patch.wireFormatEnabled).toBe(true)
    expect(action.patch.wireFormatPrefixValue).toBe('5')
  })

  it('leaves the wire format disabled when the saved format is "none"', () => {
    mount({ connectors: [connector()] })
    actions.loadSingleRequestToDispatch(singleRequest({ contentType: 'application/x-protobuf', wireFormat: { type: 'none' } }))
    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromSavedRequest') throw new Error('unreachable')
    expect(action.patch.wireFormatEnabled).toBe(false)
  })

  it('trims stage/event with defaults for a saved request', () => {
    mount()
    actions.loadSingleRequestToDispatch(singleRequest({ stage: '  ', event: null }))
    const action = dispatchLog[0]
    if (action.type !== 'draftHydratedFromSavedRequest') throw new Error('unreachable')
    expect(action.patch.loadedHistoryMetadata?.stage).toBe('single-step')
    expect(action.patch.loadedHistoryMetadata?.event).toBe('single-step-event')
  })
})
