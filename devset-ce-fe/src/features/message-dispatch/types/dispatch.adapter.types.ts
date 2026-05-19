/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// Callback interfaces used by view-transform hooks.
// State is read directly from MessageDispatchState and derived values.

import type { FieldOverridePayload, QueryValue } from '../../flow-builder/types'
import type { CollectionContextEntry } from '../pages/MessageDispatch/state/MessageDispatch.types'
import type { SingleStepHistoryEntry } from '../services/message-dispatch.service'
import type {
  ContentMode,
  DispatchKeyKind,
  HistoryContentTypeFilter,
  HistoryMessageTypeFilter,
  PayloadEditorMode,
} from './messageDispatch.types'

export interface MessageDispatchCallbacks {
  // Config
  onConnectorChange: (name: string) => void
  onContentModeChange: (mode: ContentMode) => void
  onCustomProtoSchemaChange: (schema: string) => void
  setTopicRaw: (value: string) => void
  setRoutingKeyRaw: (value: string) => void
  setExchangeRaw: (value: string) => void
  setKafkaKeyRaw: (value: string) => void
  setKafkaKeyKind: (kind: DispatchKeyKind) => void
  updateKafkaHeaderRow: (rowId: string, field: 'key' | 'value', value: string) => void
  addKafkaHeaderRow: () => void
  removeKafkaHeaderRow: (rowId: string) => void
  // Schema
  applyProtoSchemaBase: () => void
  toggleProtoSchemas: () => void
  applyProtoSchemaFromRepo: (schemaId: string) => void
  toggleProtoSchemaCollapse: () => void
  toggleJsonSchemas: () => void
  importJsonSchemaFromRepo: (schemaId: string) => void
  // Payload
  setPayloadEditorMode: (mode: PayloadEditorMode) => void
  beautifyStepStateRaw: () => void
  handleStepStateRawChange: (raw: string) => void
  setStudioSelectedField: (field: string) => void
  setStudioScopePath: (value: string) => void
  applyFunctionStudioOverride: (field: string, override: FieldOverridePayload) => void
  // Wire format
  handleWireFormatEnabledChange: (enabled: boolean) => void
  handleWireFormatSourceChange: (source: 'messagePrefix') => void
  handleWireFormatPrefixValueChange: (value: string) => void
  // Collections / Saved requests
  setNewCollectionNameRaw: (value: string) => void
  setSingleRequestNameRaw: (value: string) => void
  setSelectedCollectionName: (name: string) => void
  refreshCollections: () => Promise<void>
  createCollection: () => Promise<void>
  loadCollection: (collectionName: string) => Promise<void>
  cloneCollection: (collectionName: string) => Promise<void>
  deleteCollection: (collectionName: string) => Promise<void>
  saveSingleRequestWithValues: (collectionName: string, singleRequestName: string) => Promise<boolean>
  saveCurrentAsSingleRequest: () => Promise<boolean>
  renameSingleRequest: (collectionName: string, currentName: string, nextName: string) => Promise<boolean>
  doesSingleRequestExist: (collectionName: string, singleRequestName: string) => boolean
  loadSingleRequest: (singleRequestName: string, collectionName?: string) => Promise<void>
  deleteSingleRequest: (singleRequestName: string, collectionName?: string) => Promise<void>
  // History
  setHistorySearchQuery: (query: string) => void
  setHistoryMessageTypeFilter: (filter: HistoryMessageTypeFilter) => void
  setHistoryContentTypeFilter: (filter: HistoryContentTypeFilter) => void
  setPreviewHistoryId: (historyId: string | null) => void
  refreshHistory: () => Promise<void>
  clearHistoryFilters: () => void
  loadHistoryEntryToDispatch: (entry: SingleStepHistoryEntry) => void
  sendSingleMessage: () => Promise<void>
  // UI
  toggleHistoryPanel: () => void
  toggleCollectionsMenu: (menuKey: string) => void
  closeCollectionsMenu: () => void
  startRequestRename: (collectionName: string, requestName: string) => void
  updateEditingRequestName: (value: string) => void
  clearEditingRequest: () => void
  openSaveModal: (collectionName: string, requestName: string) => void
  closeSaveModal: () => void
  setSaveCollectionName: (value: string) => void
  setSaveRequestName: (value: string) => void
  // Collection context modal
  openCollectionContextModal: (collectionName: string) => void
  closeCollectionContextModal: () => void
  addCollectionContextEntry: () => void
  updateCollectionContextEntry: (id: string, patch: { field?: string; value?: QueryValue }) => void
  removeCollectionContextEntry: (id: string) => void
  submitCollectionContextModal: () => Promise<void> | void
}

// Re-export to keep view-layer imports concise.
export type { CollectionContextEntry }
