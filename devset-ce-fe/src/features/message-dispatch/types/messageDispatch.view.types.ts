/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FieldOverridePayload, QueryValue, SetEntry } from '../../flow-builder/types'
import type { CollectionContextEntry } from '../pages/MessageDispatch/state/MessageDispatch.types'
import type {
  ContentMode,
  DispatchHeaderRow,
  DispatchKeyKind,
  HistoryContentTypeFilter,
  HistoryMessageTypeFilter,
  PayloadEditorMode,
} from './messageDispatch.types'

type DispatchLiteralKind = 'string' | 'number' | 'boolean' | 'null' | 'json'
type DispatchValueMode = 'fn' | 'literal' | 'ref' | 'path' | 'when'

export type DispatchCollectionsPanelLabels = {
  title: string
  refresh: string
  refreshing: string
  newCollectionPlaceholder: string
  add: string
  loadingCollections: string
  emptyCollections: string
  actionsFor: string
  collectionActions: string
  clone: string
  rename: string
  delete: string
  editContext: string
  contextFieldsTitle: string
  emptyRequests: string
  requestActions: string
}

export type DispatchCollectionContextModalLabels = {
  modalAria: string
  title: string
  subtitle: string
  close: string
  cancel: string
  save: string
  saving: string
  fieldPlaceholder: string
  valuePlaceholder: string
  addField: string
  empty: string
  removeAria: string
  modeLiteral: string
  modePath: string
  modeFn: string
}

export type DispatchRequestCardLabels = {
  title: string
  subtitle: string
  loadedFromHistory: string
  loadedSingleRequest: string
  fromCollection: string
  sending: string
  send: string
  update: string
  save: string
  hideHistory: string
  history: string
  saveModalAria: string
  saveModalTitle: string
  saveModalSubtitle: string
  close: string
  collectionLabel: string
  collectionPlaceholder: string
  requestLabel: string
  requestPlaceholder: string
  cancel: string
  saving: string
  connector: string
  noConnectors: string
  contentType: string
  queue: string
  routingKey: string
  exchange: string
  topic: string
  protoSchemaTitle: string
  protoApplied: string
  applyProtoAsBase: string
  schemas: string
  import: string
  noProtoSchemas: string
  expandProtoSchema: string
  collapseProtoSchema: string
  expand: string
  collapse: string
  stepStateTitle: string
  importSchema: string
  noJsonSchemas: string
  lockedTitle: string
  lockedHint: string
  protobufNote: string
  rawDsl: string
  functionStudio: string
  rawDslProtoHint: string
  rawDslJsonHint: string
  formatJson: string
  functionStudioNote: string
  wireFormatTitle: string
  wireFormatTooltipAria: string
  wireFormatTooltip: string
  wireFormatEnable: string
  wireFormatSource: string
  wireFormatSourceMessagePrefix: string
  wireFormatPrefixValue: string
  wireFormatPrefixValueError: string
  wireFormatHint: string
}

export type DispatchKafkaEnvelopeCardLabels = {
  kafkaKey: string
  headers: string
  headerKeyPlaceholder: string
  headerValuePlaceholder: string
  headerKeyAria: string
  headerValueAria: string
  removeHeaderAria: string
  addHeaderAria: string
}

export type DispatchHistoryPanelLabels = {
  title: string
  hint: string
  refresh: string
  refreshing: string
  search: string
  searchPlaceholder: string
  broker: string
  format: string
  all: string
  clear: string
  loading: string
  empty: string
  emptyFiltered: string
  preview: string
  load: string
  missing: string
  destination: string
  run: string
}

export type DispatchHistoryPreviewModalLabels = {
  modalAria: string
  title: string
  close: string
  producer: string
  messageType: string
  contentType: string
  topic: string
  exchange: string
  routingKey: string
  key: string
  executions: string
  stage: string
  event: string
  missing: string
  state: string
  headers: string
  workflowState: string
}

export type MessageDispatchLabels = {
  collections: DispatchCollectionsPanelLabels
  collectionContext: DispatchCollectionContextModalLabels
  request: DispatchRequestCardLabels
  kafkaEnvelope: DispatchKafkaEnvelopeCardLabels
  history: DispatchHistoryPanelLabels
  historyPreview: DispatchHistoryPreviewModalLabels
}

export type DispatchCollectionRequestItemViewModel = {
  collectionName: string
  singleRequestName: string
  isSelected: boolean
  isMenuOpen: boolean
  isEditing: boolean
  editingName: string
}

export type DispatchCollectionItemViewModel = {
  collectionName: string
  requestCount: number
  contextFieldCount: number
  isExpanded: boolean
  isMenuOpen: boolean
  requests: DispatchCollectionRequestItemViewModel[]
}

export type DispatchCollectionsPanelProps = {
  labels: DispatchCollectionsPanelLabels
  isBusy: boolean
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  newCollectionNameRaw: string
  collections: DispatchCollectionItemViewModel[]
  onRefresh: () => void
  onNewCollectionNameChange: (value: string) => void
  onCreateCollection: () => void | Promise<void>
  onCollectionToggle: (collectionName: string, isExpanded: boolean) => void | Promise<void>
  onCollectionMenuToggle: (collectionName: string) => void
  onCloneCollection: (collectionName: string) => void | Promise<void>
  onDeleteCollection: (collectionName: string) => void | Promise<void>
  onEditCollectionContext: (collectionName: string) => void
  onRequestSelect: (requestName: string, collectionName: string) => void | Promise<void>
  onRequestMenuToggle: (requestName: string, collectionName: string) => void
  onRequestRenameStart: (collectionName: string, requestName: string) => void
  onEditingRequestNameChange: (value: string) => void
  onRequestRenameSubmit: () => void | Promise<void>
  onRequestRenameCancel: () => void
  onDeleteRequest: (requestName: string, collectionName: string) => void | Promise<void>
}

export type DispatchConnectorOptionViewModel = {
  name: string
  type: 'kafka' | 'rabbit'
}

export type DispatchSchemaOptionViewModel = {
  id: string
  version: number
}

export type DispatchStudioComputedViewModel = {
  scopeTrail: string[]
  snapshotEntries: SetEntry[]
  draftSetRootFields: string[]
  functionFields: string[]
  selectedFieldLiteralKindHint: DispatchLiteralKind
  draftSelectedFieldMode: DispatchValueMode | undefined
  draftSelectedFieldExpression: string | null
  draftSelectedFieldValue: string | null
  draftSelectedFieldRawValue: unknown
}

export type DispatchWireFormatViewModel = {
  enabled: boolean
  prefixSource: 'messagePrefix'
  prefixValue: string
  prefixValueError: string | null
}

export type DispatchKafkaEnvelopeCardProps = {
  labels: DispatchKafkaEnvelopeCardLabels
  isVisible: boolean
  isSending: boolean
  kafkaKeyRaw: string
  kafkaKeyKind: DispatchKeyKind
  kafkaHeadersRows: DispatchHeaderRow[]
  onKafkaKeyChange: (value: string) => void
  onKafkaKeyKindChange: (kind: DispatchKeyKind) => void
  onKafkaHeaderChange: (rowId: string, field: 'key' | 'value', value: string) => void
  onAddKafkaHeaderRow: () => void
  onRemoveKafkaHeaderRow: (rowId: string) => void
}

export type DispatchSaveModalViewModel = {
  isOpen: boolean
  collectionName: string
  requestName: string
  collectionOptions: string[]
}

export type DispatchRequestCardProps = {
  labels: DispatchRequestCardLabels
  isHistoryPanelOpen: boolean
  loadedFromHistoryId: string | null
  selectedSingleRequestName: string | null
  loadedSingleRequestCollectionName: string | null
  isSending: boolean
  isSavingSingleRequest: boolean
  canSend: boolean
  saveActionKind: 'save' | 'update'
  configError: string | null
  sendError: string | null
  saveModal: DispatchSaveModalViewModel
  connectorOptions: DispatchConnectorOptionViewModel[]
  selectedConnectorName: string
  contentMode: ContentMode
  isLoadingConfig: boolean
  topicRaw: string
  topicSuggestions: { value: string; label: string }[]
  routingKeyRaw: string
  exchangeRaw: string
  exchangeSuggestions: { value: string; label: string }[]
  kafkaEnvelopeCard: DispatchKafkaEnvelopeCardProps
  availableSchemaOptions: DispatchSchemaOptionViewModel[]
  isProtoSchemasOpen: boolean
  isProtoSchemaCollapsed: boolean
  customProtoSchemaRaw: string
  isProtoBaseApplied: boolean
  hasPendingProtoBaseChanges: boolean
  isJsonSchemasOpen: boolean
  isProtoPayloadEnabled: boolean
  isProtoEditingBlocked: boolean
  payloadEditorMode: PayloadEditorMode
  stepStateRaw: string
  /**
   * Bare field names from the loaded request's parent collection context,
   * surfaced as Raw JSON editor completions: as-is inside `"$ref": "..."`,
   * and prefixed with `state.` inside `"$path": "..."`.
   */
  contextFieldNames: string[]
  studioScopePath: string
  studioSelectedField: string
  studioComputed: DispatchStudioComputedViewModel
  functionBuilderKey: string
  wireFormat: DispatchWireFormatViewModel
  onToggleHistory: () => void
  onSend: () => void | Promise<void>
  onSaveAction: () => void | Promise<void>
  onSaveModalClose: () => void
  onSaveModalSubmit: () => void | Promise<void>
  onSaveCollectionNameChange: (value: string) => void
  onSaveRequestNameChange: (value: string) => void
  onConnectorChange: (name: string) => void
  onContentModeChange: (mode: ContentMode) => void
  onTopicChange: (value: string) => void
  onRoutingKeyChange: (value: string) => void
  onExchangeChange: (value: string) => void
  onApplyProtoSchemaBase: () => void
  onToggleProtoSchemas: () => void
  onImportProtoSchema: (schemaId: string) => void
  onToggleProtoSchemaCollapse: () => void
  onCustomProtoSchemaChange: (value: string) => void
  onToggleJsonSchemas: () => void
  onImportJsonSchema: (schemaId: string) => void
  onPayloadEditorModeChange: (mode: PayloadEditorMode) => void
  onBeautifyStepState: () => void
  onStepStateChange: (value: string) => void
  onStudioSelectedFieldChange: (field: string) => void
  onStudioScopePathChange: (scopePath: string) => void
  onApplyFunctionStudioOverride: (field: string, payload: FieldOverridePayload) => void
  onWireFormatEnabledChange: (enabled: boolean) => void
  onWireFormatSourceChange: () => void
  onWireFormatPrefixValueChange: (value: string) => void
}

export type DispatchHistoryItemViewModel = {
  id: string
  formattedDate: string
  producerName: string
  messageType: 'kafka' | 'rabbit'
  contentTypeLabel: string
  isProtobuf: boolean
  destinationLabel: string
  runIdShort: string
}

export type DispatchHistoryPanelProps = {
  labels: DispatchHistoryPanelLabels
  historyError: string | null
  isHistoryLoading: boolean
  isHistoryRefreshing: boolean
  historySearchQuery: string
  historyMessageTypeFilter: HistoryMessageTypeFilter
  historyContentTypeFilter: HistoryContentTypeFilter
  historyItemsCount: number
  filteredHistoryItems: DispatchHistoryItemViewModel[]
  isSending: boolean
  onRefresh: () => void
  onSearchQueryChange: (value: string) => void
  onMessageTypeFilterChange: (value: HistoryMessageTypeFilter) => void
  onContentTypeFilterChange: (value: HistoryContentTypeFilter) => void
  onClearFilters: () => void
  onPreview: (historyId: string) => void
  onLoad: (historyId: string) => void
}

export type DispatchHistoryPreviewViewModel = {
  formattedDate: string
  id: string
  runId: string
  workflowId: string
  producerName: string
  messageType: string
  contentType: string
  topic: string
  exchange: string
  routingKey: string
  key: string
  executions: number
  stage: string
  event: string
  schemaId: string
  protobufRootMessage: string
  wireFormatLabel: string
  state: string
  headers: string
  workflowState: string
}

export type DispatchHistoryPreviewModalProps = {
  labels: DispatchHistoryPreviewModalLabels
  entry: DispatchHistoryPreviewViewModel | null
  onClose: () => void
}

export type DispatchCollectionContextModalProps = {
  labels: DispatchCollectionContextModalLabels
  isOpen: boolean
  isSaving: boolean
  collectionName: string
  entries: CollectionContextEntry[]
  error: string | null
  onClose: () => void
  onAddEntry: () => void
  onUpdateEntry: (id: string, patch: { field?: string; value?: QueryValue }) => void
  onRemoveEntry: (id: string) => void
  onSubmit: () => void | Promise<void>
}

export type MessageDispatchProps = {
  isHistoryPanelOpen: boolean
  collectionsPanel: DispatchCollectionsPanelProps
  collectionContextModal: DispatchCollectionContextModalProps
  requestCard: DispatchRequestCardProps
  historyPanel: DispatchHistoryPanelProps
  historyPreviewModal: DispatchHistoryPreviewModalProps
}
