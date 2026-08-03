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
// MessageDispatch tabs
//
// A tab is a THIN pointer, not a copy of request parameters:
//   - savedRequestRef → the persisted SingleRequest it views (null = scratch)
//   - formSnapshot    → the full per-tab field snapshot, kept locally so tab
//                       switching is instant. Never sent to the backend, which
//                       stores pointers only.
//   - activeHistoryRef → the history entry currently loaded in the tab
//
// Only the ACTIVE tab's fields are live in MessageDispatchState. Inactive tabs
// keep their formSnapshot; switching stashes the active form into the outgoing
// tab and applies the incoming tab's snapshot.
// ──────────────────────────────────────────────────────────────

import { generateUuid } from '../../../../../shared/utils/random'
import type { MessageDispatchState } from './MessageDispatch.types'

/** Reference to a persisted saved request a tab points at. */
export type SavedRequestRef = {
  collectionName: string
  singleRequestName: string
}

/**
 * The subset of MessageDispatchState that belongs to a single request/tab.
 * Everything else in the state (connectors, schemas, collections, history list,
 * modals) is shared across all tabs.
 */
export type PerTabFields = Pick<
  MessageDispatchState,
  | 'selectedConnectorName'
  | 'topicRaw'
  | 'routingKeyRaw'
  | 'exchangeRaw'
  | 'kafkaKeyRaw'
  | 'kafkaKeyKind'
  | 'kafkaHeadersRows'
  | 'contentMode'
  | 'schemaSource'
  | 'selectedSchemaId'
  | 'customProtoSchemaRaw'
  | 'appliedProtoSchemaRaw'
  | 'protoSchemaChoice'
  | 'isProtoBaseApplied'
  | 'isProtoResyncRequired'
  | 'stepStateRaw'
  | 'payloadEditorMode'
  | 'studioOverridesByField'
  | 'studioSelectedField'
  | 'studioScopePath'
  | 'wireFormatEnabled'
  | 'wireFormatPrefixSource'
  | 'wireFormatPrefixValue'
  | 'wireFormatPrefixValueError'
  | 'loadedHistoryMetadata'
  | 'loadedFromHistoryId'
  | 'selectedSingleRequestName'
  | 'loadedSingleRequestCollectionName'
  | 'singleRequestNameRaw'
>

/** A single open tab in the message-dispatch workspace. */
export type DispatchTab = {
  id: string
  savedRequestRef: SavedRequestRef | null
  formSnapshot: PerTabFields | null
  activeHistoryRef: string | null
  title: string
  order: number
}

export const SCRATCH_TAB_TITLE = 'Untitled'

/** Creates a fresh scratch tab (no saved request) at the given position. */
export function createScratchTab(order: number): DispatchTab {
  return {
    id: generateUuid(),
    savedRequestRef: null,
    formSnapshot: null,
    activeHistoryRef: null,
    title: SCRATCH_TAB_TITLE,
    order,
  }
}

/**
 * Copies the per-tab fields out of the current state into a snapshot.
 * Listed explicitly so the compiler keeps this in sync with {@link PerTabFields}.
 */
export function extractPerTabFields(state: MessageDispatchState): PerTabFields {
  return {
    selectedConnectorName: state.selectedConnectorName,
    topicRaw: state.topicRaw,
    routingKeyRaw: state.routingKeyRaw,
    exchangeRaw: state.exchangeRaw,
    kafkaKeyRaw: state.kafkaKeyRaw,
    kafkaKeyKind: state.kafkaKeyKind,
    kafkaHeadersRows: state.kafkaHeadersRows,
    contentMode: state.contentMode,
    schemaSource: state.schemaSource,
    selectedSchemaId: state.selectedSchemaId,
    customProtoSchemaRaw: state.customProtoSchemaRaw,
    appliedProtoSchemaRaw: state.appliedProtoSchemaRaw,
    protoSchemaChoice: state.protoSchemaChoice,
    isProtoBaseApplied: state.isProtoBaseApplied,
    isProtoResyncRequired: state.isProtoResyncRequired,
    stepStateRaw: state.stepStateRaw,
    payloadEditorMode: state.payloadEditorMode,
    studioOverridesByField: state.studioOverridesByField,
    studioSelectedField: state.studioSelectedField,
    studioScopePath: state.studioScopePath,
    wireFormatEnabled: state.wireFormatEnabled,
    wireFormatPrefixSource: state.wireFormatPrefixSource,
    wireFormatPrefixValue: state.wireFormatPrefixValue,
    wireFormatPrefixValueError: state.wireFormatPrefixValueError,
    loadedHistoryMetadata: state.loadedHistoryMetadata,
    loadedFromHistoryId: state.loadedFromHistoryId,
    selectedSingleRequestName: state.selectedSingleRequestName,
    loadedSingleRequestCollectionName: state.loadedSingleRequestCollectionName,
    singleRequestNameRaw: state.singleRequestNameRaw,
  }
}

/** Returns a new state with the given per-tab snapshot applied over it. */
export function applyPerTabFields(
  state: MessageDispatchState,
  snapshot: PerTabFields,
): MessageDispatchState {
  return { ...state, ...snapshot }
}

/**
 * Serializes the currently active form into the active tab's snapshot.
 * Returns the tab list unchanged if there is no active tab.
 */
export function stashActiveTab(state: MessageDispatchState): DispatchTab[] {
  return state.tabs.map((tab) =>
    tab.id === state.activeTabId
      ? { ...tab, formSnapshot: extractPerTabFields(state), activeHistoryRef: state.loadedFromHistoryId }
      : tab,
  )
}

/** The persistable shape of the workspace (open tabs + active one). */
export type PersistedWorkspace = {
  activeTabId: string | null
  tabs: DispatchTab[]
}

/**
 * Builds the persistable workspace from the current state, stashing the active
 * form so the persisted snapshot reflects the latest edits.
 */
export function serializeWorkspace(state: MessageDispatchState): PersistedWorkspace {
  return {
    activeTabId: state.activeTabId,
    tabs: stashActiveTab(state),
  }
}
