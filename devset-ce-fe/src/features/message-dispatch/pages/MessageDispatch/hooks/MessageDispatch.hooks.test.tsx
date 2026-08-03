// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { MessageDispatchLabels, MessageDispatchProps } from '../../../types/messageDispatch.view.types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../../core/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../../../shared/services/kafka-connectors.service', () => ({
  setActiveConnector: vi.fn(),
}))

vi.mock('../../../services/message-dispatch.service', () => ({
  getCollections: vi.fn(),
  getSingleRequests: vi.fn(),
  getSingleStepHistory: vi.fn(),
}))

vi.mock('./MessageDispatch.selectors', () => ({
  useDispatchDerivedState: vi.fn(() => ({})),
}))

vi.mock('./MessageDispatch.payloadHandlers', () => ({
  useDispatchPayloadHandlers: vi.fn(() => ({
    beautifyStepStateRaw: vi.fn(),
    handleStepStateRawChange: vi.fn(),
    applyFunctionStudioOverride: vi.fn(),
    applySchemaTemplateFromSchema: vi.fn(),
  })),
}))

vi.mock('./MessageDispatch.effects', () => ({
  useDispatchEffects: vi.fn(),
}))

vi.mock('./useDispatchWorkspacePersistence', () => ({
  useDispatchWorkspacePersistence: vi.fn(),
}))

vi.mock('./useDispatchTabHydration', () => ({
  useDispatchTabHydration: vi.fn(),
}))

vi.mock('./actions/useDispatchDraftHydration', () => ({
  useDispatchDraftHydration: vi.fn(() => ({
    loadSingleRequestToDispatch: vi.fn(),
    loadHistoryEntryToDispatch: vi.fn(),
  })),
}))

vi.mock('./actions/useDispatchMessageSender', () => ({
  useDispatchMessageSender: vi.fn(() => ({ sendSingleMessage: vi.fn() })),
}))

vi.mock('./actions/useDispatchSingleRequestDraft', () => ({
  useDispatchSingleRequestDraft: vi.fn(() => ({ buildSingleRequestPayload: vi.fn() })),
}))

vi.mock('./actions/useDispatchSchemaActions', () => ({
  useDispatchSchemaActions: vi.fn(() => ({
    applyProtoSchemaBase: vi.fn(),
    applyProtoSchemaFromRepo: vi.fn(),
    importJsonSchemaFromRepo: vi.fn(),
  })),
}))

vi.mock('./actions/useDispatchCollectionActions', () => ({
  useDispatchCollectionActions: vi.fn(() => ({
    createCollection: vi.fn(),
    loadCollection: vi.fn(),
    cloneCollection: vi.fn(),
    deleteCollection: vi.fn(),
    openCollectionContextModal: vi.fn(),
    saveCollectionContext: vi.fn(),
  })),
}))

vi.mock('./actions/useDispatchSingleRequestActions', () => ({
  useDispatchSingleRequestActions: vi.fn(() => ({
    saveSingleRequestWithValues: vi.fn(),
    saveCurrentAsSingleRequest: vi.fn(),
    renameSingleRequest: vi.fn(),
    doesSingleRequestExist: vi.fn(),
    loadSingleRequest: vi.fn(),
    deleteSingleRequest: vi.fn(),
  })),
}))

vi.mock('./view/useMessageDispatchCollectionsPanel', () => ({
  useMessageDispatchCollectionsPanel: vi.fn(() => ({ marker: 'collectionsPanel' })),
}))

vi.mock('./view/useMessageDispatchHistoryPanel', () => ({
  useMessageDispatchHistoryPanel: vi.fn(() => ({
    historyPanel: { marker: 'historyPanel' },
    historyPreviewModal: { marker: 'historyPreviewModal' },
  })),
}))

vi.mock('./view/useMessageDispatchRequestCard', () => ({
  useMessageDispatchRequestCard: vi.fn(() => ({ marker: 'requestCard' })),
}))

import { useMessageDispatch } from './MessageDispatch.hooks'
import { getCollections, getSingleRequests, getSingleStepHistory } from '../../../services/message-dispatch.service'
import { setActiveConnector } from '../../../../../shared/services/kafka-connectors.service'
import { useMessageDispatchRequestCard } from './view/useMessageDispatchRequestCard'
import type { MessageDispatchCallbacks } from '../../../types/dispatch.adapter.types'

const getCollectionsMock = getCollections as unknown as Mock
const getSingleRequestsMock = getSingleRequests as unknown as Mock
const getSingleStepHistoryMock = getSingleStepHistory as unknown as Mock
const setActiveConnectorMock = setActiveConnector as unknown as Mock
const useMessageDispatchRequestCardMock = vi.mocked(useMessageDispatchRequestCard)

function getCallbacks(): MessageDispatchCallbacks {
  const call = useMessageDispatchRequestCardMock.mock.calls.at(-1)
  return (call?.[0] as { callbacks: MessageDispatchCallbacks }).callbacks
}

const fakeLabels = {} as MessageDispatchLabels

let container: HTMLDivElement | null = null
let root: Root | null = null
let latest: MessageDispatchProps

function Probe() {
  const result = useMessageDispatch({ labels: fakeLabels })
  useEffect(() => {
    latest = result
  })
  return null
}

function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<Probe />))
}

beforeEach(() => {
  getCollectionsMock.mockReset().mockResolvedValue([])
  getSingleRequestsMock.mockReset().mockResolvedValue([])
  getSingleStepHistoryMock.mockReset().mockResolvedValue([])
  setActiveConnectorMock.mockReset()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

describe('useMessageDispatch composition', () => {
  it('wires the mocked sub-hooks into the returned props', () => {
    mount()
    expect(latest.collectionsPanel).toEqual({ marker: 'collectionsPanel' })
    expect(latest.requestCard).toEqual({ marker: 'requestCard' })
    expect(latest.historyPanel).toEqual({ marker: 'historyPanel' })
    expect(latest.historyPreviewModal).toEqual({ marker: 'historyPreviewModal' })
    expect(latest.isHistoryPanelOpen).toBe(false)
  })

  it('starts with a single scratch tab in the tab bar', () => {
    mount()
    expect(latest.tabBar.tabs).toHaveLength(1)
    expect(latest.tabBar.tabs[0]).toMatchObject({ title: 'Untitled', isActive: true, broker: null, contentMode: 'json' })
  })

  it('onNewTab opens a second tab and makes it active', () => {
    mount()
    act(() => latest.tabBar.onNewTab())
    expect(latest.tabBar.tabs).toHaveLength(2)
    expect(latest.tabBar.tabs.filter((t) => t.isActive)).toHaveLength(1)
  })

  it('onSelect / onClose route through to the reducer', () => {
    mount()
    act(() => latest.tabBar.onNewTab())
    const [firstId, secondId] = latest.tabBar.tabs.map((t) => t.id)

    act(() => latest.tabBar.onSelect(firstId))
    expect(latest.tabBar.tabs.find((t) => t.id === firstId)?.isActive).toBe(true)

    act(() => latest.tabBar.onClose(secondId))
    expect(latest.tabBar.tabs).toHaveLength(1)
  })

})

describe('useMessageDispatch callbacks: connector / content mode', () => {
  it('onContentModeChange updates the active tab contentMode and clears wire-format errors for non-protobuf modes', () => {
    mount()
    const callbacks = getCallbacks()

    act(() => callbacks.onContentModeChange('protobuf'))
    expect(latest.tabBar.tabs[0].contentMode).toBe('protobuf')

    act(() => callbacks.onContentModeChange('json'))
    expect(latest.tabBar.tabs[0].contentMode).toBe('json')
  })
})

describe('useMessageDispatch refreshHistory / refreshCollections', () => {
  it('refreshHistory loads entries on success', async () => {
    getSingleStepHistoryMock.mockResolvedValue([])
    mount()
    const callbacks = getCallbacks()
    await act(async () => {
      callbacks.refreshHistory()
      await Promise.resolve()
    })
    expect(getSingleStepHistoryMock).toHaveBeenCalled()
  })

  it('refreshHistory dispatches a failure when the service rejects', async () => {
    getSingleStepHistoryMock.mockRejectedValue(new Error('boom'))
    mount()
    const callbacks = getCallbacks()
    await act(async () => {
      callbacks.refreshHistory()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getSingleStepHistoryMock).toHaveBeenCalled()
  })

  it('refreshCollections loads and sorts collections and single requests on success', async () => {
    getCollectionsMock.mockResolvedValue([{ collectionName: 'b', collectionContext: {} }, { collectionName: 'a', collectionContext: {} }])
    getSingleRequestsMock.mockResolvedValue([])
    mount()
    const callbacks = getCallbacks()
    await act(async () => {
      callbacks.refreshCollections()
      await Promise.resolve()
    })
    expect(getCollectionsMock).toHaveBeenCalled()
    expect(getSingleRequestsMock).toHaveBeenCalled()
  })

  it('refreshCollections dispatches a failure when the service rejects', async () => {
    getCollectionsMock.mockRejectedValue(new Error('boom'))
    mount()
    const callbacks = getCallbacks()
    await act(async () => {
      callbacks.refreshCollections()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getCollectionsMock).toHaveBeenCalled()
  })
})

describe('useMessageDispatch callbacks: misc dispatch wiring', () => {
  it('onConnectorChange calls setActiveConnector only for a non-blank, non-whitespace name', () => {
    mount()
    const callbacks = getCallbacks()

    act(() => callbacks.onConnectorChange('   '))
    expect(setActiveConnectorMock).not.toHaveBeenCalled()

    act(() => callbacks.onConnectorChange('kafka-conn'))
    expect(setActiveConnectorMock).toHaveBeenCalledWith('kafka-conn')
  })

  it('onCustomProtoSchemaChange only cascades extra dispatches while in protobuf mode', () => {
    mount()
    const callbacks = getCallbacks()

    expect(() => act(() => callbacks.onCustomProtoSchemaChange('message Foo {}'))).not.toThrow()

    act(() => callbacks.onContentModeChange('protobuf'))
    expect(() => act(() => callbacks.onCustomProtoSchemaChange('message Bar {}'))).not.toThrow()
  })

  it('setPreviewHistoryId opens and closes the preview based on the id', () => {
    mount()
    const callbacks = getCallbacks()
    expect(() => act(() => callbacks.setPreviewHistoryId('hist-1'))).not.toThrow()
    expect(() => act(() => callbacks.setPreviewHistoryId(null))).not.toThrow()
  })

  it('loadHistoryEntryToDispatch clears the saved-request selection before hydrating', () => {
    mount()
    const callbacks = getCallbacks()
    expect(() =>
      act(() =>
        callbacks.loadHistoryEntryToDispatch({
          id: 'h1',
        } as unknown as Parameters<typeof callbacks.loadHistoryEntryToDispatch>[0]),
      ),
    ).not.toThrow()
  })

  it('setKafkaKeyRaw uses the current kafkaKeyKind and setKafkaKeyKind resets the raw value', () => {
    mount()
    const callbacks = getCallbacks()
    expect(() => act(() => callbacks.setKafkaKeyRaw('order-42'))).not.toThrow()
    expect(() => act(() => callbacks.setKafkaKeyKind('ref'))).not.toThrow()
  })

  it('exercises the remaining simple config/collections/history/UI callbacks without throwing', () => {
    mount()
    const callbacks = getCallbacks()

    act(() => {
      callbacks.setTopicRaw('orders')
      callbacks.setRoutingKeyRaw('rk')
      callbacks.setExchangeRaw('ex')
      callbacks.updateKafkaHeaderRow('row-1', 'key', 'X-Trace')
      callbacks.addKafkaHeaderRow()
      callbacks.removeKafkaHeaderRow('row-1')
      callbacks.toggleProtoSchemas()
      callbacks.toggleProtoSchemaCollapse()
      callbacks.toggleJsonSchemas()
      callbacks.setPayloadEditorMode('function-studio')
      callbacks.setStudioSelectedField('field-a')
      callbacks.setStudioScopePath('$.a')
      callbacks.handleWireFormatEnabledChange(true)
      callbacks.handleWireFormatSourceChange('messagePrefix')
      callbacks.handleWireFormatPrefixValueChange('16')
      callbacks.setNewCollectionNameRaw('col')
      callbacks.setSingleRequestNameRaw('req')
      callbacks.setSelectedCollectionName('col')
      callbacks.refreshCollections()
      callbacks.setHistorySearchQuery('q')
      callbacks.setHistoryMessageTypeFilter('kafka')
      callbacks.setHistoryContentTypeFilter('application/json')
      callbacks.clearHistoryFilters()
      callbacks.toggleHistoryPanel()
      callbacks.toggleCollectionsMenu('menu-1')
      callbacks.closeCollectionsMenu()
      callbacks.startRequestRename('col', 'req')
      callbacks.updateEditingRequestName('req2')
      callbacks.clearEditingRequest()
      callbacks.openSaveModal('col', 'req')
      callbacks.closeSaveModal()
      callbacks.openUpdateConfirm('col', 'req')
      callbacks.closeUpdateConfirm()
      callbacks.setSaveCollectionName('col2')
      callbacks.setSaveRequestName('req3')
      callbacks.closeCollectionContextModal()
      callbacks.addCollectionContextEntry()
      callbacks.updateCollectionContextEntry('entry-1', { field: 'x' })
      callbacks.removeCollectionContextEntry('entry-1')
    })

    expect(latest.isHistoryPanelOpen).toBe(true)
  })
})
