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
// MessageDispatch reducer
//
// Pure function that handles ALL state transitions for the
// message-dispatch feature. No side effects, no API calls —
// only returns a new state object based on the incoming action.
//
// Previously these transitions were spread across 9 hooks with
// 57 individual useState calls. Now they live in one place.
// ──────────────────────────────────────────────────────────────

import { DEFAULT_PROTO_SCHEMA, DEFAULT_STEP_STATE } from '../../../message-dispatch.constants'
import { parseWireFormatPrefixValue } from '../../../message-dispatch.utils'
import type { MessageDispatchAction, MessageDispatchState } from './MessageDispatch.types'

// ──────────────────────────────────────────────────────────────
// Initial state factory
// ──────────────────────────────────────────────────────────────

/**
 * Creates the default state for the message-dispatch page.
 * Called once when the reducer is first initialized via useReducer.
 */
export function createInitialState(): MessageDispatchState {
  return {
    // ── Config ──
    connectors: [],
    selectedConnectorName: '',
    schemas: [],
    isLoadingConfig: true,
    configError: null,
    contentMode: 'json',
    schemaSource: 'none',
    selectedSchemaId: '',
    customProtoSchemaRaw: DEFAULT_PROTO_SCHEMA,
    appliedProtoSchemaRaw: '',
    protoSchemaChoice: '__manual__',
    topicRaw: '',
    topicSuggestions: [],
    exchangeSuggestions: [],
    routingKeyRaw: '',
    exchangeRaw: '',
    kafkaKeyRaw: '',
    kafkaKeyKind: 'literal',
    kafkaHeadersRows: [createEmptyHeaderRow()],
    isProtoBaseApplied: false,
    isProtoResyncRequired: false,
    isProtoSchemaCollapsed: false,
    isProtoSchemasOpen: false,
    isJsonSchemasOpen: false,

    // ── Payload ──
    stepStateRaw: DEFAULT_STEP_STATE,
    payloadEditorMode: 'raw',
    studioOverridesByField: {},
    studioSelectedField: '',
    studioScopePath: '',

    // ── Wire format ──
    wireFormatEnabled: false,
    wireFormatPrefixSource: 'messagePrefix',
    wireFormatPrefixValue: '0',
    wireFormatPrefixValueError: null,

    // ── History ──
    historyItems: [],
    isHistoryLoading: true,
    isHistoryRefreshing: false,
    historyError: null,
    historySearchQuery: '',
    historyMessageTypeFilter: 'all',
    historyContentTypeFilter: 'all',
    previewHistoryId: null,

    // ── Execution ──
    isSending: false,
    sendError: null,
    loadedHistoryMetadata: null,
    loadedFromHistoryId: null,

    // ── Collections / Saved requests ──
    collections: [],
    singleRequests: [],
    selectedCollectionName: '',
    selectedSingleRequestName: null,
    loadedSingleRequestCollectionName: null,
    newCollectionNameRaw: '',
    singleRequestNameRaw: '',
    collectionsError: null,
    isCollectionsLoading: true,
    isCollectionsRefreshing: false,
    isSavingSingleRequest: false,

    // ── UI ──
    isHistoryPanelOpen: false,
    openCollectionsMenuKey: null,
    editingRequest: null,
    isSaveModalOpen: false,
    saveCollectionName: '',
    saveRequestName: '',

    // ── Collection context modal ──
    isCollectionContextModalOpen: false,
    collectionContextModalCollectionName: '',
    collectionContextModalEntries: [],
    collectionContextModalError: null,
    isSavingCollectionContext: false,
  }
}

// ──────────────────────────────────────────────────────────────
// Pure helpers (used inside reducer — no side effects)
// ──────────────────────────────────────────────────────────────

/** Generates a UUID, falling back to a polyfill when crypto.randomUUID is unavailable (non-HTTPS). */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Creates an empty Kafka header row with a unique ID. */
function createEmptyHeaderRow() {
  return { id: generateId(), key: '', value: '' }
}

/**
 * Converts a Record of headers (e.g. from a history entry) into
 * an array of header rows suitable for the UI table.
 * Always returns at least one empty row so the table is never empty.
 */
export function toHeaderRows(
  headers: Record<string, unknown> | undefined,
): MessageDispatchState['kafkaHeadersRows'] {
  const safeHeaders = headers ?? {}
  const entries = Object.entries(safeHeaders).filter(([key]) => key.trim().length > 0)

  if (entries.length === 0) {
    return [createEmptyHeaderRow()]
  }

  return entries.map(([key, value]) => ({
    id: generateId(),
    key,
    value: String(value),
  }))
}

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────

/**
 * Main reducer for the MessageDispatch page.
 *
 * Every user interaction dispatches an action that ends up here.
 * The reducer returns a new state — it never mutates the old one,
 * never calls APIs, and never triggers side effects.
 *
 * Side-effect-only actions (init, send, refreshHistory, etc.) are
 * handled in the hook's dispatchWithEffects — the reducer just
 * returns the state unchanged for those.
 */
export function reducer(
  state: MessageDispatchState,
  action: MessageDispatchAction,
): MessageDispatchState {
  switch (action.type) {
    // ────────────────────────────────────────────────
    // Config actions
    // ────────────────────────────────────────────────

    // Called after the initial config (connectors + schemas) loads successfully.
    // Picks the active connector or falls back to the first one in the list.
    case 'configLoaded': {
      const selectedConnectorName =
        action.activeConnectorName ??
        action.connectors[0]?.name ??
        ''

      return {
        ...state,
        connectors: action.connectors,
        schemas: action.schemas,
        selectedConnectorName,
        isLoadingConfig: false,
        configError: null,
      }
    }

    // Called when the config load fails — store the error for display.
    case 'configLoadFailed':
      return { ...state, isLoadingConfig: false, configError: action.error }

    // Called when connectors change at runtime (e.g. via SSE subscription).
    // Preserves the current selection if it still exists, otherwise picks
    // the new active connector or falls back to the first available.
    case 'connectorsUpdated': {
      const currentStillExists = action.connectors.some(
        (c) => c.name === state.selectedConnectorName,
      )

      let nextSelectedName = state.selectedConnectorName
      if (!currentStillExists) {
        nextSelectedName =
          action.activeConnectorName ??
          action.connectors[0]?.name ??
          ''
      }

      return {
        ...state,
        connectors: action.connectors,
        selectedConnectorName: nextSelectedName,
      }
    }

    // User picked a different connector from the dropdown.
    case 'connectorChanged':
      if (action.name === state.selectedConnectorName) return state
      return { ...state, selectedConnectorName: action.name, topicSuggestions: [], exchangeSuggestions: [] }

    case 'topicSuggestionsLoaded':
      if (action.connectorName !== state.selectedConnectorName) return state
      return { ...state, topicSuggestions: action.topics }

    case 'rabbitBrokerResourcesLoaded':
      if (action.connectorName !== state.selectedConnectorName) return state
      return { ...state, topicSuggestions: action.queues, exchangeSuggestions: action.exchanges }

    // User switched between JSON and Protobuf content mode.
    case 'contentModeChanged':
      return { ...state, contentMode: action.mode }

    // User changed the schema source (none / repo).
    case 'schemaSourceChanged':
      return { ...state, schemaSource: action.source }

    // User selected a specific schema from the repo list.
    case 'selectedSchemaIdChanged':
      return { ...state, selectedSchemaId: action.id }

    // User typed in the custom protobuf schema editor.
    case 'customProtoSchemaChanged':
      return { ...state, customProtoSchemaRaw: action.value }

    // The applied (compiled) proto schema was updated after a successful apply.
    case 'appliedProtoSchemaChanged':
      return { ...state, appliedProtoSchemaRaw: action.value }

    // User chose a different proto schema option (manual vs a repo schema).
    case 'protoSchemaChoiceChanged':
      return { ...state, protoSchemaChoice: action.value }

    // Simple text field updates for routing configuration.
    case 'topicChanged':
      return { ...state, topicRaw: action.value }

    case 'routingKeyChanged':
      return { ...state, routingKeyRaw: action.value }

    case 'exchangeChanged':
      return { ...state, exchangeRaw: action.value }

    case 'kafkaKeyChanged':
      return { ...state, kafkaKeyRaw: action.value, kafkaKeyKind: action.kind }

    // User edited a specific key or value in an existing Kafka header row.
    case 'kafkaHeaderRowChanged':
      return {
        ...state,
        kafkaHeadersRows: state.kafkaHeadersRows.map((row) =>
          row.id === action.rowId ? { ...row, [action.field]: action.value } : row,
        ),
      }

    // User clicked "Add header" — append a new empty row.
    case 'kafkaHeaderRowAdded':
      return {
        ...state,
        kafkaHeadersRows: [...state.kafkaHeadersRows, createEmptyHeaderRow()],
      }

    // User removed a header row. If all rows are removed, keep one empty row
    // so the table is never completely empty.
    case 'kafkaHeaderRowRemoved': {
      const remaining = state.kafkaHeadersRows.filter((row) => row.id !== action.rowId)
      return {
        ...state,
        kafkaHeadersRows: remaining.length > 0 ? remaining : [createEmptyHeaderRow()],
      }
    }

    // Bulk-set Kafka headers from a history entry or saved request.
    // Converts the Record<string, unknown> into header rows.
    case 'kafkaHeadersSet':
      return { ...state, kafkaHeadersRows: toHeaderRows(action.headers) }

    // User applied the proto schema base (locked the schema for payload editing).
    case 'protoBaseApplied':
      return { ...state, isProtoBaseApplied: true }

    // User cleared the proto base (unlocked the schema for editing).
    case 'protoBaseCleared':
      return { ...state, isProtoBaseApplied: false }

    // Signals whether the payload needs to be re-synced with the proto schema.
    case 'protoResyncRequired':
      return { ...state, isProtoResyncRequired: action.value }

    // Toggle the proto schema editor panel collapsed/expanded.
    case 'protoSchemaCollapseToggled':
      return { ...state, isProtoSchemaCollapsed: !state.isProtoSchemaCollapsed }

    // Toggle the proto schemas repository dropdown open/closed.
    case 'protoSchemasToggled':
      return { ...state, isProtoSchemasOpen: !state.isProtoSchemasOpen }

    // Toggle the JSON schemas repository dropdown open/closed.
    case 'jsonSchemasToggled':
      return { ...state, isJsonSchemasOpen: !state.isJsonSchemasOpen }

    // ────────────────────────────────────────────────
    // Payload actions
    // ────────────────────────────────────────────────

    // User typed in the raw JSON payload editor.
    case 'stepStateRawChanged':
      return { ...state, stepStateRaw: action.value }

    // User clicked "Beautify JSON" — the formatted value is passed in.
    case 'stepStateBeautified':
      return { ...state, stepStateRaw: action.value }

    // User switched between "raw" and "function-studio" editor modes.
    case 'payloadEditorModeChanged':
      return { ...state, payloadEditorMode: action.mode }

    // User applied a function override in the Function Studio panel.
    case 'studioOverrideApplied':
      return {
        ...state,
        studioOverridesByField: {
          ...state.studioOverridesByField,
          [action.field]: action.payload,
        },
        studioSelectedField: action.field,
      }

    // User selected a different field in the Function Studio panel.
    case 'studioSelectedFieldChanged':
      return { ...state, studioSelectedField: action.field }

    // User changed the scope path in the Function Studio panel.
    case 'studioScopePathChanged':
      return { ...state, studioScopePath: action.value }

    // User reset the Function Studio state (clear all overrides).
    case 'studioStateReset':
      return {
        ...state,
        studioOverridesByField: {},
        studioSelectedField: '',
        studioScopePath: '',
      }

    // A schema template was applied — replaces the payload and clears studio state.
    case 'schemaTemplateApplied':
      return {
        ...state,
        stepStateRaw: action.stepStateRaw,
        studioOverridesByField: {},
        studioSelectedField: '',
        studioScopePath: '',
      }

    // ────────────────────────────────────────────────
    // Wire format actions
    // ────────────────────────────────────────────────

    // User toggled wire format on/off.
    // When enabling, validate the current prefix value. If invalid, reset to '0'.
    case 'wireFormatEnabledChanged': {
      if (!action.enabled) {
        // Turning off — clear any error and disable.
        return {
          ...state,
          wireFormatEnabled: false,
          wireFormatPrefixValueError: null,
        }
      }

      // Turning on — validate the current prefix value.
      const parsed = parseWireFormatPrefixValue(state.wireFormatPrefixValue)
      return {
        ...state,
        wireFormatEnabled: true,
        wireFormatPrefixValueError: null,
        // If the current value is invalid, reset to '0' so it is usable.
        wireFormatPrefixValue: parsed === null ? '0' : state.wireFormatPrefixValue,
      }
    }

    // User changed the wire format source (currently only 'messagePrefix').
    case 'wireFormatSourceChanged':
      return { ...state, wireFormatPrefixSource: action.source }

    // User typed a new prefix value. Validate it and set an error if out of range.
    case 'wireFormatPrefixValueChanged': {
      const parsed = parseWireFormatPrefixValue(action.value)
      return {
        ...state,
        wireFormatPrefixValue: action.value,
        wireFormatPrefixValueError: parsed === null ? 'invalid-range' : null,
      }
    }

    // Programmatically clear the prefix value validation error.
    case 'wireFormatPrefixValueErrorCleared':
      return { ...state, wireFormatPrefixValueError: null }

    // Restore wire format settings from a history entry.
    // If the entry has a valid binary-prefix config, apply it.
    // Otherwise reset wire format to defaults.
    case 'wireFormatRestoredFromHistory': {
      const wf = action.wireFormat
      if (
        wf?.type === 'binary-prefix' &&
        wf.prefix.source === 'messagePrefix' &&
        typeof wf.prefix.value === 'number'
      ) {
        return {
          ...state,
          wireFormatEnabled: true,
          wireFormatPrefixSource: 'messagePrefix',
          wireFormatPrefixValue: String(wf.prefix.value),
          wireFormatPrefixValueError: null,
        }
      }

      // No valid wire format in history — reset to defaults.
      return {
        ...state,
        wireFormatEnabled: false,
        wireFormatPrefixSource: 'messagePrefix',
        wireFormatPrefixValue: '0',
        wireFormatPrefixValueError: null,
      }
    }

    // ────────────────────────────────────────────────
    // History actions
    // ────────────────────────────────────────────────

    // Initial history load completed successfully.
    case 'historyLoaded':
      return {
        ...state,
        historyItems: action.items,
        isHistoryLoading: false,
        historyError: null,
      }

    // Initial history load failed.
    case 'historyLoadFailed':
      return {
        ...state,
        isHistoryLoading: false,
        historyError: action.error,
      }

    // A manual refresh of the history list has started (show spinner).
    case 'historyRefreshStarted':
      return { ...state, isHistoryRefreshing: true, historyError: null }

    // History refresh completed — replace items and hide spinner.
    case 'historyRefreshCompleted':
      return {
        ...state,
        historyItems: action.items,
        isHistoryRefreshing: false,
      }

    // User typed in the history search box.
    case 'historySearchChanged':
      return { ...state, historySearchQuery: action.query }

    // User changed the message type filter (all / kafka / rabbit).
    case 'historyMessageTypeFilterChanged':
      return { ...state, historyMessageTypeFilter: action.filter }

    // User changed the content type filter (all / json / protobuf).
    case 'historyContentTypeFilterChanged':
      return { ...state, historyContentTypeFilter: action.filter }

    // User opened a history entry preview panel.
    case 'historyPreviewOpened':
      return { ...state, previewHistoryId: action.historyId }

    // User closed the history preview panel.
    case 'historyPreviewClosed':
      return { ...state, previewHistoryId: null }

    // User clicked "Clear filters" — reset all history filters.
    case 'historyFiltersCleared':
      return {
        ...state,
        historySearchQuery: '',
        historyMessageTypeFilter: 'all',
        historyContentTypeFilter: 'all',
      }

    // ────────────────────────────────────────────────
    // Execution actions
    // ────────────────────────────────────────────────

    // A message send operation has started.
    case 'sendStarted':
      return { ...state, isSending: true, sendError: null }

    // Message was sent successfully.
    case 'sendCompleted':
      return { ...state, isSending: false }

    // Message send failed — store the error for display.
    case 'sendFailed':
      return { ...state, isSending: false, sendError: action.error }

    // User dismissed the send error.
    case 'sendErrorCleared':
      return { ...state, sendError: null }

    // A history entry was loaded into the dispatch form for re-sending.
    case 'historyEntryLoaded':
      return {
        ...state,
        loadedHistoryMetadata: action.metadata,
        loadedFromHistoryId: action.historyId,
      }

    // User cleared the loaded history entry (back to a fresh form).
    case 'loadedHistoryCleared':
      return {
        ...state,
        loadedHistoryMetadata: null,
        loadedFromHistoryId: null,
      }

    // ────────────────────────────────────────────────
    // Collections / Saved requests actions
    // ────────────────────────────────────────────────

    // Initial collections load completed.
    case 'collectionsLoaded':
      return {
        ...state,
        collections: action.collections,
        isCollectionsLoading: false,
        collectionsError: null,
      }

    // Initial collections load failed.
    case 'collectionsLoadFailed':
      return {
        ...state,
        isCollectionsLoading: false,
        collectionsError: action.error,
      }

    // A manual refresh of collections has started.
    case 'collectionsRefreshStarted':
      return { ...state, isCollectionsRefreshing: true, collectionsError: null }

    // Collections refresh completed — replace the collections list.
    case 'collectionsRefreshCompleted':
      return {
        ...state,
        collections: action.collections,
        isCollectionsRefreshing: false,
      }

    // User selected a collection from the sidebar.
    case 'collectionSelected':
      return { ...state, selectedCollectionName: action.name }

    // User typed in the "new collection name" input.
    case 'newCollectionNameChanged':
      return { ...state, newCollectionNameRaw: action.value }

    // User typed in the "single request name" input.
    case 'singleRequestNameChanged':
      return { ...state, singleRequestNameRaw: action.value }

    // User selected a saved request (or cleared the selection with null).
    case 'singleRequestSelected':
      return {
        ...state,
        selectedSingleRequestName: action.name,
        loadedSingleRequestCollectionName: action.collectionName,
      }

    // Saved requests for the selected collection were loaded.
    case 'singleRequestsLoaded':
      return { ...state, singleRequests: action.requests }

    // A save operation for a single request has started.
    case 'savingSingleRequestStarted':
      return { ...state, isSavingSingleRequest: true }

    // Save operation completed successfully.
    case 'savingSingleRequestCompleted':
      return { ...state, isSavingSingleRequest: false }

    // Save operation failed.
    case 'savingSingleRequestFailed':
      return { ...state, isSavingSingleRequest: false }

    // User cleared the loaded saved request selection.
    case 'loadedSelectionCleared':
      return {
        ...state,
        selectedSingleRequestName: null,
        loadedSingleRequestCollectionName: null,
        singleRequestNameRaw: '',
      }

    // ────────────────────────────────────────────────
    // UI actions
    // ────────────────────────────────────────────────

    // Toggle the history side panel open/closed.
    case 'historyPanelToggled':
      return { ...state, isHistoryPanelOpen: !state.isHistoryPanelOpen }

    // Toggle a context menu on a collection or request in the tree.
    // If the same menu key is toggled again, close it.
    case 'collectionsMenuToggled':
      return {
        ...state,
        openCollectionsMenuKey:
          state.openCollectionsMenuKey === action.menuKey ? null : action.menuKey,
      }

    // Close any open collections context menu.
    case 'collectionsMenuClosed':
      return { ...state, openCollectionsMenuKey: null }

    // User started renaming a saved request — show inline editor.
    case 'requestRenameStarted':
      return {
        ...state,
        editingRequest: {
          collectionName: action.collectionName,
          currentName: action.requestName,
          nextName: action.requestName,
        },
      }

    // User typed a new name in the inline rename editor.
    case 'editingRequestNameChanged':
      return {
        ...state,
        editingRequest: state.editingRequest
          ? { ...state.editingRequest, nextName: action.value }
          : null,
      }

    // User cancelled the rename — dismiss the inline editor.
    case 'requestRenameCancelled':
      return { ...state, editingRequest: null }

    // Rename completed (the side effect already persisted it) — dismiss editor.
    case 'requestRenameCompleted':
      return { ...state, editingRequest: null }

    // User opened the "Save as" modal with pre-filled names.
    case 'saveModalOpened':
      return {
        ...state,
        isSaveModalOpen: true,
        saveCollectionName: action.collectionName,
        saveRequestName: action.requestName,
      }

    // User closed the save modal.
    case 'saveModalClosed':
      return { ...state, isSaveModalOpen: false }

    // User typed in the collection name field inside the save modal.
    case 'saveCollectionNameChanged':
      return { ...state, saveCollectionName: action.value }

    // User typed in the request name field inside the save modal.
    case 'saveRequestNameChanged':
      return { ...state, saveRequestName: action.value }

    // ────────────────────────────────────────────────
    // Collection context modal
    // ────────────────────────────────────────────────

    case 'collectionContextModalOpened':
      return {
        ...state,
        isCollectionContextModalOpen: true,
        collectionContextModalCollectionName: action.collectionName,
        collectionContextModalEntries: action.entries,
        collectionContextModalError: null,
      }

    case 'collectionContextModalClosed':
      return {
        ...state,
        isCollectionContextModalOpen: false,
        collectionContextModalCollectionName: '',
        collectionContextModalEntries: [],
        collectionContextModalError: null,
      }

    case 'collectionContextEntryAdded':
      return {
        ...state,
        collectionContextModalEntries: [
          ...state.collectionContextModalEntries,
          { id: generateId(), field: '', value: { kind: 'literal', value: '' } },
        ],
        collectionContextModalError: null,
      }

    case 'collectionContextEntryUpdated':
      return {
        ...state,
        collectionContextModalEntries: state.collectionContextModalEntries.map((entry) =>
          entry.id === action.id ? { ...entry, ...action.patch } : entry,
        ),
        collectionContextModalError: null,
      }

    case 'collectionContextEntryRemoved':
      return {
        ...state,
        collectionContextModalEntries: state.collectionContextModalEntries.filter(
          (entry) => entry.id !== action.id,
        ),
        collectionContextModalError: null,
      }

    case 'collectionContextModalErrorSet':
      return { ...state, collectionContextModalError: action.error }

    case 'savingCollectionContextStarted':
      return { ...state, isSavingCollectionContext: true }

    case 'savingCollectionContextCompleted':
      return { ...state, isSavingCollectionContext: false }

    // ────────────────────────────────────────────────
    // Bulk state hydration
    // ────────────────────────────────────────────────

    // Load a full set of fields from a history entry into the dispatch form.
    // The hook builds the patch with exactly the fields that need updating.
    case 'draftHydratedFromHistory':
      return { ...state, ...action.patch }

    // Load a full set of fields from a saved request into the dispatch form.
    case 'draftHydratedFromSavedRequest':
      return { ...state, ...action.patch }

    // ────────────────────────────────────────────────
    // Side-effect-only actions
    //
    // These actions trigger async operations (API calls, schema
    // compilation, etc.) in the hook's dispatchWithEffects function.
    // The reducer does nothing — state stays the same.
    // ────────────────────────────────────────────────

    case 'init':
    case 'send':
    case 'refreshHistory':
    case 'refreshCollections':
    case 'createCollection':
    case 'deleteCollection':
    case 'cloneCollection':
    case 'loadCollection':
    case 'loadSingleRequest':
    case 'deleteSingleRequest':
    case 'saveSingleRequest':
    case 'submitRequestRename':
    case 'applyProtoSchemaBase':
    case 'importProtoSchema':
    case 'importJsonSchema':
    case 'loadHistoryEntry':
    case 'previewHistoryEntry':
    case 'saveModalSubmit':
      return state

    // Exhaustiveness guard — TypeScript will error here if a new action
    // is added to the union but not handled in this switch.
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}
