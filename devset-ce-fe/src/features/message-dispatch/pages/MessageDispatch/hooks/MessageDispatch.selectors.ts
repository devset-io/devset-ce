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
// useDispatchDerivedState
//
// All useMemo-based derived values extracted from the main
// useMessageDispatch hook. These values are computed from the
// reducer state and never trigger side effects.
//
// The hook receives the full MessageDispatchState and returns
// every derived value that the rest of the feature needs
// (adapters, effects, view-transform hooks, etc.).
// ──────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react'
import { useFunctionStudioComputed } from '../../../../../shared/hooks/useFunctionStudioComputed'
import {
  extractSchemaRequiredRootFields,
  extractSchemaRootLiteralKindHints,
  extractSchemaRootFields,
} from '../../../../flow-builder/utils/schema-extraction.utils'
import { toSetEntries } from '../../../../flow-builder/utils/set-entry.utils'
import { readValueAtPath } from '../../../../flow-builder/path-utils'
import type { LoadedSchema } from '../../../../flow-builder'
import type {
  MessageDispatchState,
  RepoProtoSchema,
} from '../state/MessageDispatch.types'

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useDispatchDerivedState(state: MessageDispatchState) {
  // ── Connector derived values ──
  // Find the full connector object that matches the selected name.
  const selectedConnector = useMemo(
    () => state.connectors.find((c) => c.name === state.selectedConnectorName) ?? null,
    [state.connectors, state.selectedConnectorName],
  )

  // Shorthand booleans for connector type checks used in many places.
  const isRabbitConnector = selectedConnector?.type === 'rabbit'
  const isKafkaConnector = selectedConnector?.type === 'kafka'

  // ── Schema derived values ──
  // Filter schemas list to only those matching the current content mode.
  const availableSchemas = useMemo(
    () => state.schemas.filter((s) => s.schemaType === (state.contentMode === 'protobuf' ? 'protobuf' : 'json')),
    [state.contentMode, state.schemas],
  )

  // The schema currently chosen by its ID inside the filtered list.
  const selectedRepoSchema = useMemo(
    () => availableSchemas.find((s) => s.id === state.selectedSchemaId) ?? null,
    [availableSchemas, state.selectedSchemaId],
  )

  // The "effective" schema used for payload validation and template generation.
  // In protobuf mode it comes from the proto editor; in JSON repo mode it comes
  // from the selected repo schema; otherwise null.
  const activeSchemaForPayload = useMemo(() => {
    if (state.contentMode === 'protobuf') {
      const protoSchemaRaw = state.isProtoBaseApplied ? state.appliedProtoSchemaRaw : state.customProtoSchemaRaw
      const normalized = protoSchemaRaw.trim()
      if (!normalized) return null
      return {
        id: 'dispatch-protobuf-local',
        version: 1,
        event: 'dispatch-protobuf-local',
        fileName: 'dispatch-local.proto',
        schemaType: 'protobuf',
        schema: protoSchemaRaw,
      } satisfies LoadedSchema
    }
    if (state.schemaSource === 'repo') return selectedRepoSchema
    return null
  }, [
    state.appliedProtoSchemaRaw,
    state.contentMode,
    state.customProtoSchemaRaw,
    state.isProtoBaseApplied,
    state.schemaSource,
    selectedRepoSchema,
  ])

  // ── Proto mode boolean helpers ──
  // Whether the payload editor is enabled (proto must have a base applied).
  const isProtoPayloadEnabled = state.contentMode !== 'protobuf' || state.isProtoBaseApplied

  // Whether editing is blocked because the proto schema changed and the user
  // needs to re-sync the payload.
  const isProtoEditingBlocked = state.contentMode === 'protobuf' && isProtoPayloadEnabled && state.isProtoResyncRequired

  // Whether the user has edited the proto schema since the last "apply base".
  const hasPendingProtoBaseChanges =
    state.contentMode === 'protobuf' &&
    state.isProtoBaseApplied &&
    state.customProtoSchemaRaw.trim() !== state.appliedProtoSchemaRaw.trim()

  // ── Payload / step-state derived values ──

  // Attempt to parse the raw step-state JSON. Returns null if invalid.
  const parsedStepState = useMemo(() => {
    try {
      const parsed = JSON.parse(state.stepStateRaw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>) // SAFETY: parsed confirmed as non-null object by typeof check in conditional
        : null
    } catch {
      // Intentional: invalid step-state JSON returns null — UI shows raw editor instead
      return null
    }
  }, [state.stepStateRaw])

  // ── Function studio derived values ──
  // These feed into useFunctionStudioComputed which produces the computed
  // data for the function-studio UI panel.

  const studioSelectedSchema = useMemo(
    () => (state.contentMode === 'protobuf' ? (activeSchemaForPayload ?? undefined) : undefined),
    [activeSchemaForPayload, state.contentMode],
  )

  // All field names available in the studio dropdown.
  const studioAvailableFields = useMemo(() => {
    const fromPayload = parsedStepState ? Object.keys(parsedStepState) : []
    if (state.contentMode === 'json') return fromPayload
    const fromSchema = extractSchemaRootFields(studioSelectedSchema)
    return Array.from(new Set([...fromSchema, ...fromPayload]))
  }, [state.contentMode, parsedStepState, studioSelectedSchema])

  const studioSchemaRootFields = useMemo(
    () => (state.contentMode === 'protobuf' ? extractSchemaRootFields(studioSelectedSchema) : []),
    [state.contentMode, studioSelectedSchema],
  )

  const studioSchemaLiteralKindHints = useMemo(
    () => (state.contentMode === 'protobuf' ? extractSchemaRootLiteralKindHints(studioSelectedSchema) : {}),
    [state.contentMode, studioSelectedSchema],
  )

  const studioSchemaRequiredRootFields = useMemo(
    () => (state.contentMode === 'protobuf' ? extractSchemaRequiredRootFields(studioSelectedSchema) : []),
    [state.contentMode, studioSelectedSchema],
  )

  const requiredRootFieldsSet = useMemo(
    () => new Set(studioSchemaRequiredRootFields),
    [studioSchemaRequiredRootFields],
  )

  // Entries for the "set" panel in the function studio.
  const studioSetEntries = useMemo(
    () => (parsedStepState ? toSetEntries(parsedStepState, requiredRootFieldsSet) : []),
    [parsedStepState, requiredRootFieldsSet],
  )

  // Currently selected override (if the user picked a field to override).
  const selectedStudioOverride = state.studioSelectedField
    ? state.studioOverridesByField[state.studioSelectedField]
    : undefined

  // The raw JSON value at the selected field path.
  const selectedStudioRawValue =
    parsedStepState && state.studioSelectedField
      ? readValueAtPath(parsedStepState, state.studioSelectedField)
      : undefined

  // Full computed state for the function studio (scope navigation, field
  // lists, expression evaluation, etc.).
  const studioComputed = useFunctionStudioComputed({
    setEntries: studioSetEntries,
    scopePath: state.studioScopePath,
    pendingOps: [],
    selectedSchema: studioSelectedSchema,
    studioSelectedField: state.studioSelectedField || null,
    schemaRootFields: studioSchemaRootFields,
    schemaLiteralKindHints: studioSchemaLiteralKindHints,
    schemaRequiredRootFields: studioSchemaRequiredRootFields,
    setFieldOptions: studioAvailableFields,
    selectedFieldMode: selectedStudioOverride?.mode,
    selectedFieldExpression: selectedStudioOverride?.mode === 'fn' ? selectedStudioOverride.value : null,
    selectedFieldValue:
      selectedStudioOverride?.mode === 'ref' ||
      selectedStudioOverride?.mode === 'path' ||
      selectedStudioOverride?.mode === 'literal' ||
      selectedStudioOverride?.mode === 'when'
        ? selectedStudioOverride.value
        : null,
    selectedFieldRawValue: selectedStudioRawValue,
    selectedStageState: {},
  })

  // Stable key for the function builder panel to force re-mount when the
  // selected field changes.
  const functionBuilderKey = state.studioSelectedField || 'dispatch-function-builder'

  // ── History derived values ──

  // The full history entry matching the currently previewed ID.
  const previewHistoryEntry = useMemo(
    () => state.historyItems.find((entry) => entry.id === state.previewHistoryId) ?? null,
    [state.historyItems, state.previewHistoryId],
  )

  // History entries filtered by search query and type/content filters.
  const filteredHistoryItems = useMemo(() => {
    const normalizedQuery = state.historySearchQuery.trim().toLowerCase()
    return state.historyItems.filter((entry) => {
      if (state.historyMessageTypeFilter !== 'all' && entry.messageType !== state.historyMessageTypeFilter) return false
      if (state.historyContentTypeFilter !== 'all' && entry.contentType !== state.historyContentTypeFilter) return false
      if (!normalizedQuery) return true
      const searchableValues = [
        entry.id, entry.runId, entry.workflowId, entry.producerName,
        entry.topic ?? '', entry.key ?? '', entry.routingKey ?? '', entry.exchange ?? '',
        entry.stage, entry.event, entry.messageType, entry.contentType,
      ]
      return searchableValues.some((v) => v.toLowerCase().includes(normalizedQuery))
    })
  }, [state.historyContentTypeFilter, state.historyItems, state.historyMessageTypeFilter, state.historySearchQuery])

  // ── Collections derived values ──

  // Single requests belonging to the currently selected collection.
  const selectedCollectionRequests = useMemo(
    () => state.singleRequests.filter(
      (entry) => entry.collectionName === state.selectedCollectionName,
    ),
    [state.selectedCollectionName, state.singleRequests],
  )

  // Count of single requests per collection name (used for badge display).
  const singleRequestCountsByCollection = useMemo(
    () =>
      state.singleRequests.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.collectionName] = (acc[entry.collectionName] ?? 0) + 1
        return acc
      }, {}),
    [state.singleRequests],
  )

  // ── Repo proto schema lookup ──
  // Helper used by schema actions to find a proto schema by ID.
  const findRepoProtoSchema = useCallback(
    (schemaId: string): RepoProtoSchema | null => {
      const schema = availableSchemas.find((s) => s.id === schemaId) ?? null
      if (!schema || schema.schemaType !== 'protobuf' || typeof schema.schema !== 'string') return null
      return schema as RepoProtoSchema // SAFETY: schema type narrowed by schemaType === 'protobuf' and typeof schema.schema === 'string' checks above
    },
    [availableSchemas],
  )

  return {
    selectedConnector,
    isRabbitConnector,
    isKafkaConnector,
    availableSchemas,
    selectedRepoSchema,
    activeSchemaForPayload,
    isProtoPayloadEnabled,
    isProtoEditingBlocked,
    hasPendingProtoBaseChanges,
    parsedStepState,
    studioSelectedSchema,
    studioAvailableFields,
    studioSchemaRootFields,
    studioSchemaLiteralKindHints,
    studioSchemaRequiredRootFields,
    requiredRootFieldsSet,
    studioSetEntries,
    selectedStudioOverride,
    selectedStudioRawValue,
    studioComputed,
    functionBuilderKey,
    previewHistoryEntry,
    filteredHistoryItems,
    selectedCollectionRequests,
    singleRequestCountsByCollection,
    findRepoProtoSchema,
  }
}
