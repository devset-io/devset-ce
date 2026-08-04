// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../../state/MessageDispatch.reducer'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import type { ConnectorStatus } from '../../../../../../shared/services/kafka-connectors.service'
import type { LoadedSchema } from '../../../../../flow-builder/types'
import { useDispatchSingleRequestDraft } from './useDispatchSingleRequestDraft'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../../../core/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const connector = (overrides: Partial<ConnectorStatus> = {}): ConnectorStatus => ({
  name: 'producer-a',
  type: 'kafka',
  endpoint: 'localhost:9092',
  producerConnected: true,
  consumerConnected: true,
  authenticated: true,
  ...overrides,
})

let container: HTMLDivElement | null = null
let root: Root | null = null
let build: ReturnType<typeof useDispatchSingleRequestDraft>['buildSingleRequestPayload']

function render(
  state: MessageDispatchState,
  derived: { selectedConnector: ConnectorStatus | null; activeSchemaForPayload: LoadedSchema | null },
) {
  const stateRef = { current: state }
  function Probe() {
    ;({ buildSingleRequestPayload: build } = useDispatchSingleRequestDraft({ stateRef, derived }))
    return null
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<Probe />))
}

beforeEach(() => {
  container?.remove()
  container = null
  root = null
})

describe('buildSingleRequestPayload validation', () => {
  it('throws when the request name is blank', () => {
    render(createInitialState(), { selectedConnector: connector(), activeSchemaForPayload: null })
    expect(() => build('  ', 'col')).toThrow()
  })

  it('throws when the collection name is blank', () => {
    render(createInitialState(), { selectedConnector: connector(), activeSchemaForPayload: null })
    expect(() => build('req', '  ')).toThrow()
  })

  it('trims the request and collection names', () => {
    render({ ...createInitialState(), stepStateRaw: '{"a":1}' }, { selectedConnector: connector(), activeSchemaForPayload: null })
    const payload = build(' req-a ', ' col-a ')
    expect(payload.singleRequestName).toBe('req-a')
    expect(payload.collectionName).toBe('col-a')
  })
})

describe('producerName / messageType resolution', () => {
  it('prefers the selected connector name and type', () => {
    render(createInitialState(), { selectedConnector: connector({ name: 'kafka-conn', type: 'kafka' }), activeSchemaForPayload: null })
    const payload = build('req', 'col')
    expect(payload.producerName).toBe('kafka-conn')
    expect(payload.messageType).toBe('kafka')
  })

  it('falls back to state.selectedConnectorName when no connector is selected', () => {
    render({ ...createInitialState(), selectedConnectorName: 'stale-conn' }, { selectedConnector: null, activeSchemaForPayload: null })
    const payload = build('req', 'col')
    expect(payload.producerName).toBe('stale-conn')
    expect(payload.messageType).toBe('kafka')
  })

  it('falls back to "local" when neither is set', () => {
    render(createInitialState(), { selectedConnector: null, activeSchemaForPayload: null })
    const payload = build('req', 'col')
    expect(payload.producerName).toBe('local')
  })

  it('reads messageType from a rabbit connector', () => {
    render(createInitialState(), { selectedConnector: connector({ type: 'rabbit' }), activeSchemaForPayload: null })
    const payload = build('req', 'col')
    expect(payload.messageType).toBe('rabbit')
  })
})

describe('protoSchema resolution', () => {
  it('is null in json content mode', () => {
    render({ ...createInitialState(), contentMode: 'json' }, { selectedConnector: connector(), activeSchemaForPayload: { id: 's1', version: 1, schema: 'message X {}' } as LoadedSchema })
    expect(build('req', 'col').protoSchema).toBeNull()
  })

  it('uses the active repo schema when present in protobuf mode', () => {
    render({ ...createInitialState(), contentMode: 'protobuf' }, { selectedConnector: connector(), activeSchemaForPayload: { id: 's1', version: 1, schema: 'message X {}' } as LoadedSchema })
    expect(build('req', 'col').protoSchema).toBe('message X {}')
  })

  it('falls back to the custom proto schema when no repo schema is active', () => {
    render(
      { ...createInitialState(), contentMode: 'protobuf', customProtoSchemaRaw: 'message Custom {}' },
      { selectedConnector: connector(), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').protoSchema).toBe('message Custom {}')
  })
})

describe('field mapping', () => {
  it('maps content type, topic/exchange/routingKey, and history metadata', () => {
    render(
      {
        ...createInitialState(),
        contentMode: 'protobuf',
        topicRaw: ' orders ',
        exchangeRaw: '  ',
        routingKeyRaw: 'rk-1',
        loadedHistoryMetadata: {
          workflowId: 'wf-1',
          executions: 4,
          stage: ' stage-x ',
          event: ' event-x ',
          headers: {},
          workflowState: { done: true },
        },
      },
      { selectedConnector: connector(), activeSchemaForPayload: null },
    )
    const payload = build('req', 'col')
    expect(payload.contentType).toBe('application/x-protobuf')
    expect(payload.topic).toBe('orders')
    expect(payload.exchange).toBeNull()
    expect(payload.routingKey).toBe('rk-1')
    expect(payload.executions).toBe(4)
    expect(payload.stage).toBe('stage-x')
    expect(payload.event).toBe('event-x')
    expect(payload.workflowState).toEqual({ done: true })
  })

  it('defaults executions/stage/event when no history metadata is present', () => {
    render(createInitialState(), { selectedConnector: connector(), activeSchemaForPayload: null })
    const payload = build('req', 'col')
    expect(payload.executions).toBe(1)
    expect(payload.stage).toBeNull()
    expect(payload.event).toBeNull()
    expect(payload.workflowState).toEqual({})
  })

  it('parses stepStateRaw strictly, throwing on invalid JSON', () => {
    render({ ...createInitialState(), stepStateRaw: 'not-json' }, { selectedConnector: connector(), activeSchemaForPayload: null })
    expect(() => build('req', 'col')).toThrow()
  })

  it('serializes the kafka key for kafka requests', () => {
    render(
      { ...createInitialState(), stepStateRaw: '{"a":1}', kafkaKeyKind: 'ref', kafkaKeyRaw: 'orderId' },
      { selectedConnector: connector({ type: 'kafka' }), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').key).toEqual({ $ref: 'orderId' })
  })

  it('leaves the key null for non-kafka requests', () => {
    render(
      { ...createInitialState(), stepStateRaw: '{"a":1}', kafkaKeyRaw: 'ignored' },
      { selectedConnector: connector({ type: 'rabbit' }), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').key).toBeNull()
  })

  it('collects non-blank kafka header rows into a record', () => {
    render(
      {
        ...createInitialState(),
        stepStateRaw: '{"a":1}',
        kafkaHeadersRows: [
          { id: 'r1', key: 'X-Trace', value: 'abc' },
          { id: 'r2', key: '  ', value: 'ignored' },
        ],
      },
      { selectedConnector: connector({ type: 'kafka' }), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').headers).toEqual({ 'X-Trace': 'abc' })
  })

  it('falls back to loadedHistoryMetadata.headers for non-kafka requests', () => {
    render(
      {
        ...createInitialState(),
        stepStateRaw: '{"a":1}',
        loadedHistoryMetadata: {
          workflowId: 'wf-1',
          executions: 1,
          stage: 's',
          event: 'e',
          headers: { 'X-From-History': '1' },
          workflowState: {},
        },
      },
      { selectedConnector: connector({ type: 'rabbit' }), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').headers).toEqual({ 'X-From-History': '1' })
  })

  it('uses an empty headers record when non-kafka and history headers are not a record', () => {
    render({ ...createInitialState(), stepStateRaw: '{"a":1}' }, { selectedConnector: connector({ type: 'rabbit' }), activeSchemaForPayload: null })
    expect(build('req', 'col').headers).toEqual({})
  })

  it('resolves the saved wire format for an enabled protobuf request', () => {
    render(
      { ...createInitialState(), stepStateRaw: '{"a":1}', contentMode: 'protobuf', wireFormatEnabled: true, wireFormatPrefixValue: '7' },
      { selectedConnector: connector(), activeSchemaForPayload: null },
    )
    expect(build('req', 'col').wireFormat).toEqual({
      type: 'binary-prefix',
      prefix: { size: 2, source: 'messagePrefix', value: 7 },
    })
  })

  it('defaults the wire format to "none" outside protobuf mode', () => {
    render({ ...createInitialState(), stepStateRaw: '{"a":1}', contentMode: 'json' }, { selectedConnector: connector(), activeSchemaForPayload: null })
    expect(build('req', 'col').wireFormat).toEqual({ type: 'none' })
  })
})
