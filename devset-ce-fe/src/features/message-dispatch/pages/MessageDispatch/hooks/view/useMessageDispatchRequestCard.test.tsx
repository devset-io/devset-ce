// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInitialState } from '../../state/MessageDispatch.reducer'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import type { MessageDispatchCallbacks } from '../../../../types/dispatch.adapter.types'
import type { DispatchRequestCardLabels, DispatchRequestCardProps } from '../../../../types/messageDispatch.view.types'
import { useMessageDispatchRequestCard } from './useMessageDispatchRequestCard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const labels = {
  updateConfirmMessage: 'Update {name} in {collection}?',
} as unknown as DispatchRequestCardLabels
const kafkaEnvelopeLabels = {} as DispatchRequestCardProps['kafkaEnvelopeCard']['labels']

function createCallbacks(overrides: Partial<MessageDispatchCallbacks> = {}): MessageDispatchCallbacks {
  const store: Record<string, unknown> = { ...overrides }
  return new Proxy({} as MessageDispatchCallbacks, {
    get(_target, prop: string) {
      if (!(prop in store)) {
        store[prop] = vi.fn()
      }
      return store[prop]
    },
  })
}

type Derived = Parameters<typeof useMessageDispatchRequestCard>[0]['derived']

const baseDerived = {
  selectedConnector: {
    name: 'producer-a',
    type: 'kafka' as const,
    endpoint: 'localhost:9092',
    producerConnected: true,
    consumerConnected: true,
    authenticated: true,
  },
  isProtoPayloadEnabled: true,
  isProtoEditingBlocked: false,
  hasPendingProtoBaseChanges: false,
  availableSchemas: [],
  isRabbitConnector: false,
  isKafkaConnector: true,
  studioComputed: {
    hasPendingChanges: false,
    scopeTrail: [],
    snapshotEntries: [],
    draftSetRootFields: [],
    functionFields: [],
    selectedFieldLiteralKindHint: null,
    draftSelectedFieldMode: 'literal',
    draftSelectedFieldExpression: '',
    draftSelectedFieldValue: '',
    draftSelectedFieldRawValue: '',
    draftSelectedStageState: {},
    sourceFieldOptions: [],
    sourceFieldPaths: [],
    sourceFieldTree: [],
  },
  functionBuilderKey: 'key-1',
} as unknown as Derived

let container: HTMLDivElement | null = null
let root: Root | null = null
let latest: DispatchRequestCardProps

function render(
  state: MessageDispatchState,
  callbacks: MessageDispatchCallbacks,
  derived: Derived = baseDerived,
) {
  function Probe() {
    latest = useMessageDispatchRequestCard({ labels, kafkaEnvelopeLabels, state, derived, callbacks })
    return null
  }
  if (!root) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  act(() => root?.render(<Probe />))
}

beforeEach(() => {
  container?.remove()
  container = null
  root = null
})

describe('resolvedSingleRequestName / isLoadedSingleRequest / saveActionKind', () => {
  it('prefers the raw draft name over the selected saved-request name', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false })
    render({ ...createInitialState(), singleRequestNameRaw: 'draft', selectedSingleRequestName: 'saved' }, callbacks)
    expect(latest.saveModal.requestName).toBe('')
  })

  it('marks saveActionKind as "update" when the request already exists in the collection', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => true })
    render(createInitialState(), callbacks)
    expect(latest.saveActionKind).toBe('update')
  })

  it('marks saveActionKind as "update" when a saved request is loaded (not from history)', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false })
    render(
      {
        ...createInitialState(),
        loadedFromHistoryId: null,
        selectedSingleRequestName: 'req-a',
        loadedSingleRequestCollectionName: 'col-a',
      },
      callbacks,
    )
    expect(latest.saveActionKind).toBe('update')
  })

  it('marks saveActionKind as "save" when loaded from history even if selection is set', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false })
    render(
      {
        ...createInitialState(),
        loadedFromHistoryId: 'hist-1',
        selectedSingleRequestName: 'req-a',
        loadedSingleRequestCollectionName: 'col-a',
      },
      callbacks,
    )
    expect(latest.saveActionKind).toBe('save')
  })
})

describe('canSend', () => {
  it('is true when sending is idle, a connector is selected, and proto payload is valid', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }))
    expect(latest.canSend).toBe(true)
  })

  it('is false while sending', () => {
    render({ ...createInitialState(), isSending: true }, createCallbacks({ doesSingleRequestExist: () => false }))
    expect(latest.canSend).toBe(false)
  })

  it('is false without a selected connector', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }), {
      ...baseDerived,
      selectedConnector: null,
    })
    expect(latest.canSend).toBe(false)
  })

  it('is false when proto payload is not enabled', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }), {
      ...baseDerived,
      isProtoPayloadEnabled: false,
    })
    expect(latest.canSend).toBe(false)
  })

  it('is false when proto editing is blocked', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }), {
      ...baseDerived,
      isProtoEditingBlocked: true,
    })
    expect(latest.canSend).toBe(false)
  })

  it('is false in protobuf mode with wire format enabled and a prefix error', () => {
    render(
      {
        ...createInitialState(),
        contentMode: 'protobuf',
        wireFormatEnabled: true,
        wireFormatPrefixValueError: 'invalid-range',
      },
      createCallbacks({ doesSingleRequestExist: () => false }),
    )
    expect(latest.canSend).toBe(false)
  })

  it('is true in protobuf mode with wire format enabled but no prefix error', () => {
    render(
      {
        ...createInitialState(),
        contentMode: 'protobuf',
        wireFormatEnabled: true,
        wireFormatPrefixValueError: null,
      },
      createCallbacks({ doesSingleRequestExist: () => false }),
    )
    expect(latest.canSend).toBe(true)
  })
})

describe('connectorOptions / contextFieldNames / availableSchemaOptions', () => {
  it('maps connector types, coercing anything non-rabbit to kafka', () => {
    render(
      {
        ...createInitialState(),
        connectors: [
          { name: 'k1', type: 'kafka', endpoint: '', producerConnected: true, consumerConnected: true, authenticated: true },
          { name: 'r1', type: 'rabbit', endpoint: '', producerConnected: true, consumerConnected: true, authenticated: true },
        ],
      },
      createCallbacks({ doesSingleRequestExist: () => false }),
    )
    expect(latest.connectorOptions).toEqual([
      { name: 'k1', type: 'kafka' },
      { name: 'r1', type: 'rabbit' },
    ])
  })

  it('returns no context field names without a source collection', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }))
    expect(latest.contextFieldNames).toEqual([])
  })

  it('reads context field names from the loaded collection, preferring loadedSingleRequestCollectionName', () => {
    render(
      {
        ...createInitialState(),
        loadedSingleRequestCollectionName: 'col-a',
        selectedCollectionName: 'col-b',
        collections: [
          { collectionName: 'col-a', collectionContext: { userId: '', region: '' } },
          { collectionName: 'col-b', collectionContext: { other: '' } },
        ],
      },
      createCallbacks({ doesSingleRequestExist: () => false }),
    )
    expect(latest.contextFieldNames).toEqual(['userId', 'region'])
  })

  it('returns no context field names when the source collection is not found', () => {
    render(
      { ...createInitialState(), selectedCollectionName: 'missing' },
      createCallbacks({ doesSingleRequestExist: () => false }),
    )
    expect(latest.contextFieldNames).toEqual([])
  })

  it('maps available schemas to id/version view models', () => {
    render(createInitialState(), createCallbacks({ doesSingleRequestExist: () => false }), {
      ...baseDerived,
      availableSchemas: [{ id: 's1', version: 2 } as unknown as (typeof baseDerived.availableSchemas)[number]],
    })
    expect(latest.availableSchemaOptions).toEqual([{ id: 's1', version: 2 }])
  })
})

describe('onSaveAction', () => {
  it('opens the update confirm when a matching single request already exists', () => {
    const openUpdateConfirm = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => true, openUpdateConfirm })
    render(
      { ...createInitialState(), selectedCollectionName: 'col-a', selectedSingleRequestName: 'req-a', singleRequestNameRaw: 'req-a' },
      callbacks,
    )
    latest.onSaveAction()
    expect(openUpdateConfirm).toHaveBeenCalledWith('col-a', 'req-a')
  })

  it('opens the save modal with a collection fallback chain when nothing is selected', () => {
    const openSaveModal = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, openSaveModal })
    render(
      { ...createInitialState(), collections: [{ collectionName: 'first-col', collectionContext: {} }] },
      callbacks,
    )
    latest.onSaveAction()
    expect(openSaveModal).toHaveBeenCalledWith('first-col', '')
  })
})

describe('update confirm handlers', () => {
  it('does not close while a save is in flight', () => {
    const closeUpdateConfirm = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeUpdateConfirm })
    render({ ...createInitialState(), isSavingSingleRequest: true }, callbacks)
    latest.onUpdateConfirmClose()
    expect(closeUpdateConfirm).not.toHaveBeenCalled()
  })

  it('closes when not saving', () => {
    const closeUpdateConfirm = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeUpdateConfirm })
    render(createInitialState(), callbacks)
    latest.onUpdateConfirmClose()
    expect(closeUpdateConfirm).toHaveBeenCalled()
  })

  it('closes the confirm dialog only when the save succeeds', async () => {
    const closeUpdateConfirm = vi.fn()
    const saveCurrentAsSingleRequest = vi.fn().mockResolvedValue(true)
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeUpdateConfirm, saveCurrentAsSingleRequest })
    render(createInitialState(), callbacks)
    await latest.onUpdateConfirmSubmit()
    expect(closeUpdateConfirm).toHaveBeenCalled()
  })

  it('keeps the confirm dialog open when the save fails', async () => {
    const closeUpdateConfirm = vi.fn()
    const saveCurrentAsSingleRequest = vi.fn().mockResolvedValue(false)
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeUpdateConfirm, saveCurrentAsSingleRequest })
    render(createInitialState(), callbacks)
    await latest.onUpdateConfirmSubmit()
    expect(closeUpdateConfirm).not.toHaveBeenCalled()
  })

  it('renders the interpolated update-confirm message when open', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false })
    render(
      { ...createInitialState(), updateConfirm: { collectionName: 'col-a', requestName: 'req-a' } },
      callbacks,
    )
    expect(latest.updateConfirm).toEqual({ isOpen: true, message: 'Update req-a in col-a?' })
  })

  it('leaves the update-confirm message blank when closed', () => {
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false })
    render(createInitialState(), callbacks)
    expect(latest.updateConfirm).toEqual({ isOpen: false, message: '' })
  })
})

describe('save modal handlers', () => {
  it('does not close while a save is in flight', () => {
    const closeSaveModal = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeSaveModal })
    render({ ...createInitialState(), isSavingSingleRequest: true }, callbacks)
    latest.onSaveModalClose()
    expect(closeSaveModal).not.toHaveBeenCalled()
  })

  it('closes when not saving', () => {
    const closeSaveModal = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeSaveModal })
    render(createInitialState(), callbacks)
    latest.onSaveModalClose()
    expect(closeSaveModal).toHaveBeenCalled()
  })

  it('submits with the modal fields and closes on success', async () => {
    const closeSaveModal = vi.fn()
    const saveSingleRequestWithValues = vi.fn().mockResolvedValue(true)
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeSaveModal, saveSingleRequestWithValues })
    render({ ...createInitialState(), saveCollectionName: 'col', saveRequestName: 'req' }, callbacks)
    await latest.onSaveModalSubmit()
    expect(saveSingleRequestWithValues).toHaveBeenCalledWith('col', 'req')
    expect(closeSaveModal).toHaveBeenCalled()
  })

  it('keeps the modal open when the save fails', async () => {
    const closeSaveModal = vi.fn()
    const saveSingleRequestWithValues = vi.fn().mockResolvedValue(false)
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, closeSaveModal, saveSingleRequestWithValues })
    render(createInitialState(), callbacks)
    await latest.onSaveModalSubmit()
    expect(closeSaveModal).not.toHaveBeenCalled()
  })
})

describe('onWireFormatSourceChange', () => {
  it('always forwards "messagePrefix" regardless of arguments', () => {
    const handleWireFormatSourceChange = vi.fn()
    const callbacks = createCallbacks({ doesSingleRequestExist: () => false, handleWireFormatSourceChange })
    render(createInitialState(), callbacks)
    latest.onWireFormatSourceChange()
    expect(handleWireFormatSourceChange).toHaveBeenCalledWith('messagePrefix')
  })
})
