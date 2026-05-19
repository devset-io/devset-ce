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
// MessageDispatch types
//
// Single source of truth for all state, actions, and domain
// types used in the message-dispatch feature. Previously
// scattered across 3 type files and 9 hooks with 57 useState.
// ──────────────────────────────────────────────────────────────

import type { FieldOverridePayload, LoadedSchema, QueryValue, StageWireFormat } from '../../../../flow-builder/types'
import type { ConnectorStatus } from '../../../../../shared/services/kafka-connectors.service'
import type { DispatchKeyKind } from '../../../types/messageDispatch.types'
import type {
  CollectionSummary as ServiceCollectionSummary,
  SingleRequestPayload as ServiceSingleRequestPayload,
  SingleStepHistoryEntry,
} from '../../../services/message-dispatch.service'

// ── Re-export domain types (from old types/messageDispatch.types.ts) ──

export type ContentMode = 'json' | 'protobuf'
export type SchemaSource = 'none' | 'repo'
export type PayloadEditorMode = 'raw' | 'function-studio'
export type RepoProtoSchema = LoadedSchema & { schemaType: 'protobuf'; schema: string }
export type DispatchHeaderRow = { id: string; key: string; value: string }

export type LoadedHistoryMetadata = {
  workflowId?: string
  executions: number
  stage: string
  event: string
  headers: Record<string, unknown>
  workflowState?: Record<string, unknown>
  protobufRootMessage?: string
}

export type HistoryMessageTypeFilter = 'all' | 'kafka' | 'rabbit'
export type HistoryContentTypeFilter = 'all' | 'application/json' | 'application/x-protobuf'

export type EditingRequestState = {
  collectionName: string
  currentName: string
  nextName: string
}

/**
 * A single row in the collection-context editor.
 * Mirrors the shape of a Database Query Filter row (field + value)
 * minus the operator column.
 */
export type CollectionContextEntry = {
  id: string
  field: string
  value: QueryValue
}

export type { ServiceCollectionSummary as CollectionSummary }
export type { ServiceSingleRequestPayload as SingleRequestPayload }

// ──────────────────────────────────────────────────────────────
// State — all 57 fields organized by domain.
// Each section maps to a former useState hook that was absorbed.
// ──────────────────────────────────────────────────────────────

export interface MessageDispatchState {
  // ── Config (from useDispatchConfigState — 21 fields) ──
  // Connectors, schemas, content mode, routing fields, proto schema
  connectors: ConnectorStatus[]
  selectedConnectorName: string
  schemas: LoadedSchema[]
  isLoadingConfig: boolean
  configError: string | null
  contentMode: ContentMode
  schemaSource: SchemaSource
  selectedSchemaId: string
  customProtoSchemaRaw: string
  appliedProtoSchemaRaw: string
  protoSchemaChoice: string
  topicRaw: string
  topicSuggestions: string[]
  exchangeSuggestions: string[]
  routingKeyRaw: string
  exchangeRaw: string
  kafkaKeyRaw: string
  kafkaKeyKind: DispatchKeyKind
  kafkaHeadersRows: DispatchHeaderRow[]
  isProtoBaseApplied: boolean
  isProtoResyncRequired: boolean
  isProtoSchemaCollapsed: boolean
  isProtoSchemasOpen: boolean
  isJsonSchemasOpen: boolean

  // ── Payload (from useDispatchPayloadState — 5 fields) ──
  // Raw JSON editor, function studio overrides
  stepStateRaw: string
  payloadEditorMode: PayloadEditorMode
  studioOverridesByField: Record<string, FieldOverridePayload>
  studioSelectedField: string
  studioScopePath: string

  // ── Wire format (from useDispatchWireFormatState — 4 fields) ──
  // Protobuf message framing configuration
  wireFormatEnabled: boolean
  wireFormatPrefixSource: 'messagePrefix'
  wireFormatPrefixValue: string
  wireFormatPrefixValueError: 'invalid-range' | null

  // ── History (from useMessageDispatchHistory — 8 fields) ──
  // Dispatch history list with filters
  historyItems: SingleStepHistoryEntry[]
  isHistoryLoading: boolean
  isHistoryRefreshing: boolean
  historyError: string | null
  historySearchQuery: string
  historyMessageTypeFilter: HistoryMessageTypeFilter
  historyContentTypeFilter: HistoryContentTypeFilter
  previewHistoryId: string | null

  // ── Execution (from useMessageDispatchViewModel — 4 fields) ──
  // Send operation state
  isSending: boolean
  sendError: string | null
  loadedHistoryMetadata: LoadedHistoryMetadata | null
  loadedFromHistoryId: string | null

  // ── Collections / Saved requests (from useDispatchSavedRequestsCatalog — 11 fields) ──
  collections: ServiceCollectionSummary[]
  singleRequests: ServiceSingleRequestPayload[]
  selectedCollectionName: string
  selectedSingleRequestName: string | null
  loadedSingleRequestCollectionName: string | null
  newCollectionNameRaw: string
  singleRequestNameRaw: string
  collectionsError: string | null
  isCollectionsLoading: boolean
  isCollectionsRefreshing: boolean
  isSavingSingleRequest: boolean

  // ── UI (from useMessageDispatchUiState — 6 fields) ──
  isHistoryPanelOpen: boolean
  openCollectionsMenuKey: string | null
  editingRequest: EditingRequestState | null
  isSaveModalOpen: boolean
  saveCollectionName: string
  saveRequestName: string

  // ── Collection context modal ──
  // When open, edits the collectionContext template for the given collection
  // as a list of field+value rows (literal/path/fn).
  isCollectionContextModalOpen: boolean
  collectionContextModalCollectionName: string
  collectionContextModalEntries: CollectionContextEntry[]
  collectionContextModalError: string | null
  isSavingCollectionContext: boolean
}

// ──────────────────────────────────────────────────────────────
// Action union — every user interaction dispatches one of these.
// Organized by domain, matching the state sections above.
// ──────────────────────────────────────────────────────────────

export type MessageDispatchAction =
  // ── Config ──
  | { type: 'configLoaded'; connectors: ConnectorStatus[]; activeConnectorName: string | null; schemas: LoadedSchema[] }
  | { type: 'configLoadFailed'; error: string }
  | { type: 'connectorsUpdated'; connectors: ConnectorStatus[]; activeConnectorName: string | null }
  | { type: 'connectorChanged'; name: string }
  | { type: 'topicSuggestionsLoaded'; connectorName: string; topics: string[] }
  | { type: 'rabbitBrokerResourcesLoaded'; connectorName: string; queues: string[]; exchanges: string[] }
  | { type: 'contentModeChanged'; mode: ContentMode }
  | { type: 'schemaSourceChanged'; source: SchemaSource }
  | { type: 'selectedSchemaIdChanged'; id: string }
  | { type: 'customProtoSchemaChanged'; value: string }
  | { type: 'appliedProtoSchemaChanged'; value: string }
  | { type: 'protoSchemaChoiceChanged'; value: string }
  | { type: 'topicChanged'; value: string }
  | { type: 'routingKeyChanged'; value: string }
  | { type: 'exchangeChanged'; value: string }
  | { type: 'kafkaKeyChanged'; value: string; kind: DispatchKeyKind }
  | { type: 'kafkaHeaderRowChanged'; rowId: string; field: 'key' | 'value'; value: string }
  | { type: 'kafkaHeaderRowAdded' }
  | { type: 'kafkaHeaderRowRemoved'; rowId: string }
  | { type: 'kafkaHeadersSet'; headers: Record<string, unknown> | undefined }
  | { type: 'protoBaseApplied' }
  | { type: 'protoBaseCleared' }
  | { type: 'protoResyncRequired'; value: boolean }
  | { type: 'protoSchemaCollapseToggled' }
  | { type: 'protoSchemasToggled' }
  | { type: 'jsonSchemasToggled' }

  // ── Payload ──
  | { type: 'stepStateRawChanged'; value: string }
  | { type: 'stepStateBeautified'; value: string }
  | { type: 'payloadEditorModeChanged'; mode: PayloadEditorMode }
  | { type: 'studioOverrideApplied'; field: string; payload: FieldOverridePayload }
  | { type: 'studioSelectedFieldChanged'; field: string }
  | { type: 'studioScopePathChanged'; value: string }
  | { type: 'studioStateReset' }
  | { type: 'schemaTemplateApplied'; stepStateRaw: string }

  // ── Wire format ──
  | { type: 'wireFormatEnabledChanged'; enabled: boolean }
  | { type: 'wireFormatSourceChanged'; source: 'messagePrefix' }
  | { type: 'wireFormatPrefixValueChanged'; value: string }
  | { type: 'wireFormatPrefixValueErrorCleared' }
  | { type: 'wireFormatRestoredFromHistory'; wireFormat: StageWireFormat | undefined }

  // ── History ──
  | { type: 'historyLoaded'; items: SingleStepHistoryEntry[] }
  | { type: 'historyLoadFailed'; error: string }
  | { type: 'historyRefreshStarted' }
  | { type: 'historyRefreshCompleted'; items: SingleStepHistoryEntry[] }
  | { type: 'historySearchChanged'; query: string }
  | { type: 'historyMessageTypeFilterChanged'; filter: HistoryMessageTypeFilter }
  | { type: 'historyContentTypeFilterChanged'; filter: HistoryContentTypeFilter }
  | { type: 'historyPreviewOpened'; historyId: string }
  | { type: 'historyPreviewClosed' }
  | { type: 'historyFiltersCleared' }

  // ── Execution ──
  | { type: 'sendStarted' }
  | { type: 'sendCompleted' }
  | { type: 'sendFailed'; error: string }
  | { type: 'sendErrorCleared' }
  | { type: 'historyEntryLoaded'; metadata: LoadedHistoryMetadata; historyId: string }
  | { type: 'loadedHistoryCleared' }

  // ── Collections / Saved requests ──
  | { type: 'collectionsLoaded'; collections: ServiceCollectionSummary[] }
  | { type: 'collectionsLoadFailed'; error: string }
  | { type: 'collectionsRefreshStarted' }
  | { type: 'collectionsRefreshCompleted'; collections: ServiceCollectionSummary[] }
  | { type: 'collectionSelected'; name: string }
  | { type: 'newCollectionNameChanged'; value: string }
  | { type: 'singleRequestNameChanged'; value: string }
  | { type: 'singleRequestSelected'; name: string | null; collectionName: string | null }
  | { type: 'singleRequestsLoaded'; requests: ServiceSingleRequestPayload[] }
  | { type: 'savingSingleRequestStarted' }
  | { type: 'savingSingleRequestCompleted' }
  | { type: 'savingSingleRequestFailed' }
  | { type: 'loadedSelectionCleared' }

  // ── UI ──
  | { type: 'historyPanelToggled' }
  | { type: 'collectionsMenuToggled'; menuKey: string }
  | { type: 'collectionsMenuClosed' }
  | { type: 'requestRenameStarted'; collectionName: string; requestName: string }
  | { type: 'editingRequestNameChanged'; value: string }
  | { type: 'requestRenameCancelled' }
  | { type: 'requestRenameCompleted' }
  | { type: 'saveModalOpened'; collectionName: string; requestName: string }
  | { type: 'saveModalClosed' }
  | { type: 'saveCollectionNameChanged'; value: string }
  | { type: 'saveRequestNameChanged'; value: string }

  // ── Collection context modal ──
  | { type: 'collectionContextModalOpened'; collectionName: string; entries: CollectionContextEntry[] }
  | { type: 'collectionContextModalClosed' }
  | { type: 'collectionContextEntryAdded' }
  | { type: 'collectionContextEntryUpdated'; id: string; patch: Partial<CollectionContextEntry> }
  | { type: 'collectionContextEntryRemoved'; id: string }
  | { type: 'collectionContextModalErrorSet'; error: string | null }
  | { type: 'savingCollectionContextStarted' }
  | { type: 'savingCollectionContextCompleted' }

  // ── Bulk state hydration (loading from history/saved request) ──
  | { type: 'draftHydratedFromHistory'; patch: Partial<MessageDispatchState> }
  | { type: 'draftHydratedFromSavedRequest'; patch: Partial<MessageDispatchState> }

  // ── Side-effect-only actions (handled in dispatchWithEffects) ──
  | { type: 'init' }
  | { type: 'send' }
  | { type: 'refreshHistory' }
  | { type: 'refreshCollections' }
  | { type: 'createCollection' }
  | { type: 'deleteCollection'; name: string }
  | { type: 'cloneCollection'; name: string }
  | { type: 'loadCollection'; name: string }
  | { type: 'loadSingleRequest'; name: string; collectionName?: string }
  | { type: 'deleteSingleRequest'; name: string; collectionName?: string }
  | { type: 'saveSingleRequest' }
  | { type: 'submitRequestRename' }
  | { type: 'applyProtoSchemaBase' }
  | { type: 'importProtoSchema'; schemaId: string }
  | { type: 'importJsonSchema'; schemaId: string }
  | { type: 'loadHistoryEntry'; historyId: string }
  | { type: 'previewHistoryEntry'; historyId: string }
  | { type: 'saveModalSubmit' }
