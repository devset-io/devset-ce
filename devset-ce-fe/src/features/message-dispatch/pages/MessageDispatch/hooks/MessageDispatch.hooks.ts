/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// useMessageDispatch — single-reducer orchestration hook
//
// Wires together:
//   1. Derived state    (useDispatchDerivedState)
//   2. Payload handlers (useDispatchPayloadHandlers)
//   3. Side effects     (useDispatchEffects)
//   4. Action hooks     (schema, hydration, sender, collections, requests)
//   5. Callbacks        (dispatch-based, built inline)
//   6. View-transform hooks (collections panel, request card, history)
//
// All state lives in MessageDispatchState via useReducer.
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { setActiveConnector } from '../../../../../shared/services/kafka-connectors.service'
import {
  getCollections,
  getSingleRequests,
  getSingleStepHistory,
} from '../../../services/message-dispatch.service'
import type { MessageDispatchCallbacks } from '../../../types/dispatch.adapter.types'
import type { MessageDispatchLabels, MessageDispatchProps } from '../../../types/messageDispatch.view.types'
import { normalizeError } from '../../../../../shared/utils/error'
import { sortCollections, sortSingleRequests } from './utils/dispatchSavedRequests.utils'
import { reducer, createInitialState } from '../state/MessageDispatch.reducer'
import type { DispatchKeyKind } from '../../../types/messageDispatch.types'

// ── Sub-hooks ──
import { useDispatchDerivedState } from './MessageDispatch.selectors'
import { useDispatchPayloadHandlers } from './MessageDispatch.payloadHandlers'
import { useDispatchEffects } from './MessageDispatch.effects'

// ── Action hooks (dispatch-based) ──
import { useDispatchDraftHydration } from './actions/useDispatchDraftHydration'
import { useDispatchMessageSender } from './actions/useDispatchMessageSender'
import { useDispatchSingleRequestDraft } from './actions/useDispatchSingleRequestDraft'
import { useDispatchSchemaActions } from './actions/useDispatchSchemaActions'
import { useDispatchCollectionActions } from './actions/useDispatchCollectionActions'
import { useDispatchSingleRequestActions } from './actions/useDispatchSingleRequestActions'

// ── View-transform hooks (produce component props) ──
import { useMessageDispatchCollectionsPanel } from './view/useMessageDispatchCollectionsPanel'
import { useMessageDispatchHistoryPanel } from './view/useMessageDispatchHistoryPanel'
import { useMessageDispatchRequestCard } from './view/useMessageDispatchRequestCard'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type UseMessageDispatchOptions = {
  labels: MessageDispatchLabels
}

// ──────────────────────────────────────────────────────────────
// Module-scope helpers
// ──────────────────────────────────────────────────────────────

// normalizeError is imported from utils/dispatchExecution.utils.ts

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useMessageDispatch({ labels }: UseMessageDispatchOptions): MessageDispatchProps {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  // Stable ref for reading state in callbacks without stale closures.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ── 1. Derived state (all useMemo-based computed values) ──
  const derived = useDispatchDerivedState(state)

  // ── 2. Payload handlers (step-state manipulation callbacks) ──
  const payloadHandlers = useDispatchPayloadHandlers(dispatch, stateRef, derived, t)

  // ── 3. Async helpers for refreshing history / collections ──
  const refreshHistory = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) dispatch({ type: 'historyRefreshStarted' })
      try {
        const entries = await getSingleStepHistory()
        dispatch(showSpinner
          ? { type: 'historyRefreshCompleted', items: entries }
          : { type: 'historyLoaded', items: entries })
      } catch (error) {
        dispatch({ type: 'historyLoadFailed', error: normalizeError(error, t('dispatch.error.loadSingleStepHistory')) })
      }
    },
    [t],
  )

  const refreshCollections = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) dispatch({ type: 'collectionsRefreshStarted' })
      try {
        const [nextCollections, nextSingleRequests] = await Promise.all([getCollections(), getSingleRequests()])
        const sorted = sortCollections(nextCollections)
        const sortedRequests = sortSingleRequests(nextSingleRequests)
        dispatch(showSpinner
          ? { type: 'collectionsRefreshCompleted', collections: sorted }
          : { type: 'collectionsLoaded', collections: sorted })
        dispatch({ type: 'singleRequestsLoaded', requests: sortedRequests })
      } catch (error) {
        dispatch({
          type: 'collectionsLoadFailed',
          error: normalizeError(error, t('dispatch.vm.loadCollectionsAndRequestsFailed')),
        })
      }
    },
    [t],
  )

  // ── 4. Side effects (init, subscriptions, proto sync, etc.) ──
  useDispatchEffects(state, dispatch, stateRef, derived, t)

  // ── 5. Action hooks (dispatch-based, no adapter dependency) ──
  const schemaActions = useDispatchSchemaActions({
    dispatch,
    stateRef,
    derived: {
      findRepoProtoSchema: derived.findRepoProtoSchema,
      availableSchemas: derived.availableSchemas,
    },
    applySchemaTemplateFromSchema: payloadHandlers.applySchemaTemplateFromSchema,
  })

  const hydrationActions = useDispatchDraftHydration({
    dispatch,
    stateRef,
    findRepoProtoSchema: derived.findRepoProtoSchema,
  })
  const singleRequestDraft = useDispatchSingleRequestDraft({
    stateRef,
    derived: {
      selectedConnector: derived.selectedConnector,
      activeSchemaForPayload: derived.activeSchemaForPayload,
    },
  })
  const messageSender = useDispatchMessageSender({
    dispatch,
    stateRef,
    derived: {
      selectedConnector: derived.selectedConnector,
      selectedRepoSchema: derived.selectedRepoSchema,
      activeSchemaForPayload: derived.activeSchemaForPayload,
    },
    refreshHistory,
  })

  const collectionActions = useDispatchCollectionActions({
    dispatch,
    stateRef,
    refreshCollections,
  })
  const singleRequestActions = useDispatchSingleRequestActions({
    dispatch,
    stateRef,
    refreshCollections,
    buildSingleRequestPayload: singleRequestDraft.buildSingleRequestPayload,
    loadSingleRequestToDispatch: hydrationActions.loadSingleRequestToDispatch,
  })

  // ── 6. Callbacks (all dispatch-based, plain value signatures) ──
  const callbacks: MessageDispatchCallbacks = useMemo(
    () => ({
      // Config
      onConnectorChange: (name: string) => {
        dispatch({ type: 'connectorChanged', name })
        if (name.trim()) setActiveConnector(name)
      },
      onContentModeChange: (mode: 'json' | 'protobuf') => {
        dispatch({ type: 'contentModeChanged', mode })
        if (mode !== 'protobuf') dispatch({ type: 'wireFormatPrefixValueErrorCleared' })
      },
      onCustomProtoSchemaChange: (nextSchemaRaw: string) => {
        dispatch({ type: 'customProtoSchemaChanged', value: nextSchemaRaw })
        if (stateRef.current.contentMode === 'protobuf') {
          dispatch({ type: 'schemaSourceChanged', source: 'none' })
          dispatch({ type: 'protoSchemaChoiceChanged', value: '__manual__' })
          if (stateRef.current.isProtoSchemaCollapsed) {
            dispatch({ type: 'protoSchemaCollapseToggled' })
          }
        }
      },
      setTopicRaw: (value: string) => dispatch({ type: 'topicChanged', value }),
      setRoutingKeyRaw: (value: string) => dispatch({ type: 'routingKeyChanged', value }),
      setExchangeRaw: (value: string) => dispatch({ type: 'exchangeChanged', value }),
      setKafkaKeyRaw: (value: string) => dispatch({ type: 'kafkaKeyChanged', value, kind: stateRef.current.kafkaKeyKind }),
      setKafkaKeyKind: (kind: DispatchKeyKind) => dispatch({ type: 'kafkaKeyChanged', value: '', kind }),
      updateKafkaHeaderRow: (rowId: string, field: 'key' | 'value', value: string) =>
        dispatch({ type: 'kafkaHeaderRowChanged', rowId, field, value }),
      addKafkaHeaderRow: () => dispatch({ type: 'kafkaHeaderRowAdded' }),
      removeKafkaHeaderRow: (rowId: string) => dispatch({ type: 'kafkaHeaderRowRemoved', rowId }),

      // Schema
      applyProtoSchemaBase: schemaActions.applyProtoSchemaBase,
      toggleProtoSchemas: () => dispatch({ type: 'protoSchemasToggled' }),
      applyProtoSchemaFromRepo: schemaActions.applyProtoSchemaFromRepo,
      toggleProtoSchemaCollapse: () => dispatch({ type: 'protoSchemaCollapseToggled' }),
      toggleJsonSchemas: () => dispatch({ type: 'jsonSchemasToggled' }),
      importJsonSchemaFromRepo: schemaActions.importJsonSchemaFromRepo,

      // Payload
      setPayloadEditorMode: (mode: 'raw' | 'function-studio') =>
        dispatch({ type: 'payloadEditorModeChanged', mode }),
      beautifyStepStateRaw: payloadHandlers.beautifyStepStateRaw,
      handleStepStateRawChange: payloadHandlers.handleStepStateRawChange,
      setStudioSelectedField: (field: string) =>
        dispatch({ type: 'studioSelectedFieldChanged', field }),
      setStudioScopePath: (value: string) =>
        dispatch({ type: 'studioScopePathChanged', value }),
      applyFunctionStudioOverride: payloadHandlers.applyFunctionStudioOverride,

      // Wire format
      handleWireFormatEnabledChange: (enabled: boolean) =>
        dispatch({ type: 'wireFormatEnabledChanged', enabled }),
      handleWireFormatSourceChange: (source: 'messagePrefix') =>
        dispatch({ type: 'wireFormatSourceChanged', source }),
      handleWireFormatPrefixValueChange: (value: string) =>
        dispatch({ type: 'wireFormatPrefixValueChanged', value }),

      // Collections / Saved requests
      setNewCollectionNameRaw: (value: string) =>
        dispatch({ type: 'newCollectionNameChanged', value }),
      setSingleRequestNameRaw: (value: string) =>
        dispatch({ type: 'singleRequestNameChanged', value }),
      setSelectedCollectionName: (name: string) =>
        dispatch({ type: 'collectionSelected', name }),
      refreshCollections: () => refreshCollections(),
      createCollection: collectionActions.createCollection,
      loadCollection: collectionActions.loadCollection,
      cloneCollection: collectionActions.cloneCollection,
      deleteCollection: collectionActions.deleteCollection,
      saveSingleRequestWithValues: singleRequestActions.saveSingleRequestWithValues,
      saveCurrentAsSingleRequest: singleRequestActions.saveCurrentAsSingleRequest,
      renameSingleRequest: singleRequestActions.renameSingleRequest,
      doesSingleRequestExist: singleRequestActions.doesSingleRequestExist,
      loadSingleRequest: singleRequestActions.loadSingleRequest,
      deleteSingleRequest: singleRequestActions.deleteSingleRequest,

      // History
      setHistorySearchQuery: (query: string) =>
        dispatch({ type: 'historySearchChanged', query }),
      setHistoryMessageTypeFilter: (filter: 'all' | 'kafka' | 'rabbit') =>
        dispatch({ type: 'historyMessageTypeFilterChanged', filter }),
      setHistoryContentTypeFilter: (filter: 'all' | 'application/json' | 'application/x-protobuf') =>
        dispatch({ type: 'historyContentTypeFilterChanged', filter }),
      setPreviewHistoryId: (historyId: string | null) => {
        if (historyId) dispatch({ type: 'historyPreviewOpened', historyId })
        else dispatch({ type: 'historyPreviewClosed' })
      },
      refreshHistory: () => refreshHistory(),
      clearHistoryFilters: () => dispatch({ type: 'historyFiltersCleared' }),
      loadHistoryEntryToDispatch: (entry) => {
        dispatch({ type: 'singleRequestSelected', name: null, collectionName: null })
        hydrationActions.loadHistoryEntryToDispatch(entry)
      },
      sendSingleMessage: messageSender.sendSingleMessage,

      // UI
      toggleHistoryPanel: () => dispatch({ type: 'historyPanelToggled' }),
      toggleCollectionsMenu: (menuKey: string) =>
        dispatch({ type: 'collectionsMenuToggled', menuKey }),
      closeCollectionsMenu: () => dispatch({ type: 'collectionsMenuClosed' }),
      startRequestRename: (collectionName: string, requestName: string) =>
        dispatch({ type: 'requestRenameStarted', collectionName, requestName }),
      updateEditingRequestName: (value: string) =>
        dispatch({ type: 'editingRequestNameChanged', value }),
      clearEditingRequest: () => dispatch({ type: 'requestRenameCancelled' }),
      openSaveModal: (collectionName: string, requestName: string) =>
        dispatch({ type: 'saveModalOpened', collectionName, requestName }),
      closeSaveModal: () => dispatch({ type: 'saveModalClosed' }),
      setSaveCollectionName: (value: string) =>
        dispatch({ type: 'saveCollectionNameChanged', value }),
      setSaveRequestName: (value: string) =>
        dispatch({ type: 'saveRequestNameChanged', value }),

      // Collection context modal
      openCollectionContextModal: collectionActions.openCollectionContextModal,
      closeCollectionContextModal: () => dispatch({ type: 'collectionContextModalClosed' }),
      addCollectionContextEntry: () => dispatch({ type: 'collectionContextEntryAdded' }),
      updateCollectionContextEntry: (id, patch) =>
        dispatch({ type: 'collectionContextEntryUpdated', id, patch }),
      removeCollectionContextEntry: (id) =>
        dispatch({ type: 'collectionContextEntryRemoved', id }),
      submitCollectionContextModal: collectionActions.saveCollectionContext,
    }),
    [
      schemaActions, collectionActions, singleRequestActions,
      hydrationActions, messageSender, payloadHandlers,
      refreshHistory, refreshCollections, dispatch,
    ],
  )

  // ── 7. View-transform hooks — produce the final component props ──
  const isBusy = state.isSending || state.isSavingSingleRequest

  const collectionsPanel = useMessageDispatchCollectionsPanel({
    labels: labels.collections,
    state,
    derived: {
      selectedCollectionRequests: derived.selectedCollectionRequests,
      singleRequestCountsByCollection: derived.singleRequestCountsByCollection,
    },
    callbacks,
    isBusy,
  })

  const requestCard = useMessageDispatchRequestCard({
    labels: labels.request,
    kafkaEnvelopeLabels: labels.kafkaEnvelope,
    state,
    derived: {
      selectedConnector: derived.selectedConnector,
      isProtoPayloadEnabled: derived.isProtoPayloadEnabled,
      isProtoEditingBlocked: derived.isProtoEditingBlocked,
      hasPendingProtoBaseChanges: derived.hasPendingProtoBaseChanges,
      availableSchemas: derived.availableSchemas,
      isRabbitConnector: derived.isRabbitConnector,
      isKafkaConnector: derived.isKafkaConnector,
      studioComputed: derived.studioComputed,
      functionBuilderKey: derived.functionBuilderKey,
    },
    callbacks,
  })

  const { historyPanel, historyPreviewModal } = useMessageDispatchHistoryPanel({
    historyLabels: labels.history,
    historyPreviewLabels: labels.historyPreview,
    state,
    derived: {
      filteredHistoryItems: derived.filteredHistoryItems,
      previewHistoryEntry: derived.previewHistoryEntry,
    },
    callbacks,
  })

  // ──────────────────────────────────────────────────────────────
  // Return props
  // ──────────────────────────────────────────────────────────────

  const collectionContextModal = useMemo(
    () => ({
      labels: labels.collectionContext,
      isOpen: state.isCollectionContextModalOpen,
      isSaving: state.isSavingCollectionContext,
      collectionName: state.collectionContextModalCollectionName,
      entries: state.collectionContextModalEntries,
      error: state.collectionContextModalError,
      onClose: callbacks.closeCollectionContextModal,
      onAddEntry: callbacks.addCollectionContextEntry,
      onUpdateEntry: callbacks.updateCollectionContextEntry,
      onRemoveEntry: callbacks.removeCollectionContextEntry,
      onSubmit: callbacks.submitCollectionContextModal,
    }),
    [
      labels.collectionContext,
      state.isCollectionContextModalOpen,
      state.isSavingCollectionContext,
      state.collectionContextModalCollectionName,
      state.collectionContextModalEntries,
      state.collectionContextModalError,
      callbacks,
    ],
  )

  return {
    isHistoryPanelOpen: state.isHistoryPanelOpen,
    collectionsPanel,
    collectionContextModal,
    requestCard,
    historyPanel,
    historyPreviewModal,
  }
}
