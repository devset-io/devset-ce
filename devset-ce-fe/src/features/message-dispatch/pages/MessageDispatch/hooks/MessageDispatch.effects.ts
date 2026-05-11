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
// useDispatchEffects
//
// All useEffect blocks extracted from the main useMessageDispatch
// hook. These handle:
//   - Initial data loading (connectors, schemas, history, collections)
//   - SSE connector subscription
//   - Proto schema sync effects
//   - Function studio field auto-selection
//   - Collections menu outside-click close
//
// The hook receives state, dispatch, stateRef, and derived values
// as parameters so it never owns state directly.
// ──────────────────────────────────────────────────────────────

import { type Dispatch, type RefObject, useEffect, useRef } from 'react'
import {
  loadConnectorsState,
  subscribeConnectorsChanges,
  loadConnectorSuggestions,
} from '../../../../../shared/services/kafka-connectors.service'
import { loadWorkflowSchemas } from '../../../../flow-builder/services/schema-loader.service'
import type { LoadedSchema } from '../../../../flow-builder/types'
import { DEFAULT_PROTO_SCHEMA } from '../../../message-dispatch.constants'
import {
  getCollections,
  getSingleRequests,
  getSingleStepHistory,
} from '../../../services/message-dispatch.service'
import { normalizeError } from '../../../../../shared/utils/error'
import { sortCollections, sortSingleRequests, toSavedRequestsErrorMessage } from './utils/dispatchSavedRequests.utils'
import type {
  MessageDispatchAction,
  MessageDispatchState,
} from '../state/MessageDispatch.types'

// ──────────────────────────────────────────────────────────────
// Types for the derived values this hook needs
// ──────────────────────────────────────────────────────────────

type EffectDerived = {
  availableSchemas: LoadedSchema[]
  selectedRepoSchema: LoadedSchema | null
  studioComputed: { functionFields: string[] }
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useDispatchEffects(
  state: MessageDispatchState,
  dispatch: Dispatch<MessageDispatchAction>,
  stateRef: RefObject<MessageDispatchState>,
  derived: EffectDerived,
  t: (key: string, options?: Record<string, string>) => string,
): void {
  const { availableSchemas, selectedRepoSchema, studioComputed } = derived

  // ── Init: load connectors + schemas ──
  // Fires once on mount. Fetches the initial connector list and
  // available schemas from the backend.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [connectorState, loadedSchemas] = await Promise.all([
          loadConnectorsState(),
          loadWorkflowSchemas(),
        ])
        if (cancelled) return
        dispatch({
          type: 'configLoaded',
          connectors: connectorState.connectors,
          activeConnectorName: connectorState.activeConnectorName,
          schemas: loadedSchemas,
        })
      } catch (error) {
        if (cancelled) return
        dispatch({
          type: 'configLoadFailed',
          error: normalizeError(error, t('dispatch.error.loadConnectorsAndSchemas')),
        })
      }
    }

    void load()
    return () => { cancelled = true }
  }, [dispatch, t])

  // ── Connector subscription (SSE updates) ──
  // Subscribes to real-time connector changes. When the backend
  // reports a new active connector or configuration change, we
  // update the reducer state accordingly.
  useEffect(() => {
    const unsubscribe = subscribeConnectorsChanges((change) => {
      if (change.type === 'active_connector_changed') {
        if (change.activeConnectorName) {
          const s = stateRef.current
          if (s.connectors.some((c) => c.name === change.activeConnectorName)) {
            dispatch({ type: 'connectorChanged', name: change.activeConnectorName })
          }
        }
        return
      }
      // configurations_changed -- reload everything
      void (async () => {
        try {
          const [connectorState, loadedSchemas] = await Promise.all([
            loadConnectorsState(),
            loadWorkflowSchemas(),
          ])
          dispatch({
            type: 'configLoaded',
            connectors: connectorState.connectors,
            activeConnectorName: connectorState.activeConnectorName,
            schemas: loadedSchemas,
          })
        } catch {
          // Intentional: config reload failure is non-critical — retried on next SSE change event
        }
      })()
    })
    return unsubscribe
  }, [dispatch, stateRef])

  // ── Connector resource suggestions ──
  // When the selected connector changes, fetch topic suggestions (Kafka)
  // or broker resources (RabbitMQ). Uses an AbortController per request
  // so switching connectors cancels any in-flight fetch.
  // Reads connectors via ref to avoid re-triggering when connectors list updates
  // independently of the selection (SSE refreshes). The effect re-runs on
  // selectedConnectorName changes, which is the only meaningful trigger.
  const suggestionsAbortRef = useRef<AbortController | null>(null)
  const connectorsRef = useRef(state.connectors)
  useEffect(() => {
    connectorsRef.current = state.connectors
  }, [state.connectors])

  useEffect(() => {
    const connectorName = state.selectedConnectorName
    if (!connectorName) return

    suggestionsAbortRef.current?.abort()
    const controller = new AbortController()
    suggestionsAbortRef.current = controller

    const connector = connectorsRef.current.find((c) => c.name === connectorName)
    if (!connector) return

    void loadConnectorSuggestions(connector, controller.signal, {
      onTopics: (name, topics) => dispatch({ type: 'topicSuggestionsLoaded', connectorName: name, topics }),
      onRabbitResources: (name, queues, exchanges) =>
        dispatch({ type: 'rabbitBrokerResourcesLoaded', connectorName: name, queues, exchanges }),
    })

    return () => { controller.abort() }
  }, [state.selectedConnectorName, dispatch])

  // ── Initial history load ──
  // Fetches the single-step history entries on mount.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const entries = await getSingleStepHistory()
        if (cancelled) return
        dispatch({ type: 'historyLoaded', items: entries })
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'historyLoadFailed',
            error: normalizeError(error, t('dispatch.error.loadSingleStepHistory')),
          })
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [dispatch, t])

  // ── Initial collections load ──
  // Fetches saved collections and single requests on mount.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [nextCollections, nextSingleRequests] = await Promise.all([
          getCollections(),
          getSingleRequests(),
        ])
        if (cancelled) return
        const sorted = sortCollections(nextCollections)
        const sortedRequests = sortSingleRequests(nextSingleRequests)
        dispatch({ type: 'collectionsLoaded', collections: sorted })
        dispatch({ type: 'singleRequestsLoaded', requests: sortedRequests })
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'collectionsLoadFailed',
            error: toSavedRequestsErrorMessage(error, t('dispatch.vm.loadCollectionsAndRequestsFailed')),
          })
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [dispatch, t])

  // ── Proto schema sync effects ──
  // These effects keep the proto-related state consistent when
  // the user switches content modes, changes schema sources, etc.

  // When switching away from protobuf, clear proto-specific state.
  useEffect(() => {
    if (state.contentMode !== 'protobuf') {
      dispatch({ type: 'protoResyncRequired', value: false })
      if (state.isProtoSchemasOpen) dispatch({ type: 'protoSchemasToggled' })
    }
  }, [state.contentMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // When in JSON mode, close JSON schemas if source changes.
  useEffect(() => {
    if (state.contentMode !== 'json') {
      if (state.isJsonSchemasOpen) dispatch({ type: 'jsonSchemasToggled' })
      if (state.schemaSource !== 'repo' && state.schemaSource !== 'none') {
        dispatch({ type: 'schemaSourceChanged', source: 'none' })
      }
      return
    }
    if (state.schemaSource !== 'repo' && state.schemaSource !== 'none') {
      dispatch({ type: 'schemaSourceChanged', source: 'none' })
    }
  }, [state.contentMode, state.schemaSource]) // eslint-disable-line react-hooks/exhaustive-deps

  // Proto defaults reset -- when entering protobuf mode without a base,
  // set sensible defaults for the proto editor.
  useEffect(() => {
    if (state.contentMode !== 'protobuf' || state.schemaSource !== 'none') return
    if (state.isProtoBaseApplied) return
    dispatch({ type: 'protoSchemaChoiceChanged', value: '__manual__' })
    if (!state.customProtoSchemaRaw.trim()) {
      dispatch({ type: 'customProtoSchemaChanged', value: DEFAULT_PROTO_SCHEMA })
    }
    if (state.isProtoSchemaCollapsed) {
      dispatch({ type: 'protoSchemaCollapseToggled' })
    }
  }, [state.contentMode, state.customProtoSchemaRaw, state.isProtoBaseApplied, state.schemaSource]) // eslint-disable-line react-hooks/exhaustive-deps

  // Schema fallback when schemaSource is 'repo' -- auto-select the
  // first available schema if the previously selected one is gone.
  useEffect(() => {
    if (state.schemaSource !== 'repo') return
    if (state.selectedSchemaId && availableSchemas.some((s) => s.id === state.selectedSchemaId)) return
    const fallback = availableSchemas[0] ?? null
    dispatch({ type: 'selectedSchemaIdChanged', id: fallback?.id ?? '' })
    if (state.contentMode === 'protobuf' && fallback?.schemaType === 'protobuf' && typeof fallback.schema === 'string') {
      dispatch({ type: 'customProtoSchemaChanged', value: fallback.schema })
    }
  }, [availableSchemas, state.contentMode, state.schemaSource, state.selectedSchemaId, dispatch])

  // Sync custom proto schema with selected repo schema.
  useEffect(() => {
    if (state.contentMode !== 'protobuf' || state.schemaSource !== 'repo') return
    if (!selectedRepoSchema || selectedRepoSchema.schemaType !== 'protobuf' || typeof selectedRepoSchema.schema !== 'string') return
    dispatch({ type: 'customProtoSchemaChanged', value: selectedRepoSchema.schema })
  }, [state.contentMode, state.schemaSource, selectedRepoSchema, dispatch])

  // Proto schema choice sync -- keep the choice dropdown in sync
  // with the actual selected schema.
  useEffect(() => {
    if (state.contentMode !== 'protobuf') return
    if (state.schemaSource === 'repo' && state.selectedSchemaId) {
      dispatch({ type: 'protoSchemaChoiceChanged', value: state.selectedSchemaId })
      return
    }
    dispatch({ type: 'protoSchemaChoiceChanged', value: '__manual__' })
  }, [state.contentMode, state.schemaSource, state.selectedSchemaId, dispatch])

  // ── Studio field auto-selection ──
  // When the available function fields change, auto-select the first
  // one if nothing is selected or the current selection is invalid.
  useEffect(() => {
    if (studioComputed.functionFields.length === 0) {
      if (state.studioSelectedField) dispatch({ type: 'studioSelectedFieldChanged', field: '' })
      return
    }
    if (state.studioSelectedField && studioComputed.functionFields.includes(state.studioSelectedField)) return
    dispatch({ type: 'studioSelectedFieldChanged', field: studioComputed.functionFields[0] })
  }, [studioComputed.functionFields, state.studioSelectedField, dispatch])

  // ── Close collections menu on outside click ──
  // When a collections context menu is open, clicking outside the
  // menu wrapper closes it.
  useEffect(() => {
    if (!state.openCollectionsMenuKey) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.dispatch-tree-menu-wrap')) return
      dispatch({ type: 'collectionsMenuClosed' })
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [state.openCollectionsMenuKey, dispatch])
}
