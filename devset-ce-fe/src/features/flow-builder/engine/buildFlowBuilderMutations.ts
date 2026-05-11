/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { addEdge, MarkerType } from '@xyflow/react'
import {
  buildNewStepData,
  NODE_PALETTE,
  orderNodesByConnections,
} from '../config/node-palette.config'
import { normalizeFnCallsInDslBlock, normalizeFunctionCallExpression } from '../function-call.utils'
import {
  buildDefaultSetFromSchema,
  extractSchemaRootFields,
} from '../utils/schema-extraction.utils'
import { parseRawDslValue } from '../utils/dsl-value.utils'
import { omitNodeOverrides } from './useFlowBuilderOverrides'
import type { FlowBuilderDerivedState } from './useFlowBuilderDerived'
import type React from 'react'
import type {
  BuilderEdge,
  BuilderNode,
  BuilderNodeData,
  FieldOverridePayload,
  FlowBuilderBootstrap,
  FnOverrides,
  LoadedSchema,
  QueryConfig,
  RepeatOverrides,
  StageWireFormat,
  WorkflowState,
} from '../types'
import {msg} from "../../../shared/utils/i18n.ts";


// ──────────────────────────────────────────────────────────────
// buildFlowBuilderMutations
//
// Plain function (NOT a React hook) that returns all cross-domain
// mutation methods. These methods coordinate state changes across
// multiple domain hooks. Called inside the composition hook on
// every render – the returned functions close over the current
// params so they always see fresh state.
// ──────────────────────────────────────────────────────────────

// ── Module-scope helpers ─────────────────────────────────────

// Given a type hint (like "number" or "boolean"), return a sensible
// default value for a new workflow state field.
const resolveWorkflowStateDefaultFromHint = (
  hint: 'string' | 'number' | 'boolean' | 'null' | 'json' | undefined,
): WorkflowState[keyof WorkflowState] => {
  if (hint === 'number') {
    return 0
  }
  if (hint === 'boolean') {
    return false
  }
  if (hint === 'null') {
    return null
  }
  if (hint === 'json') {
    return {}
  }
  if (hint === 'string') {
    return ''
  }
  return null
}

// Type guard: checks if a value is a plain JS object (not null, not an array).
const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// Parse a raw JSON string and validate it's a plain object.
const parseRawJsonObject = (raw: string, fieldName: 'set' | 'state'): Record<string, unknown> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : msg('Niepoprawny JSON', 'Invalid JSON')
    throw new Error(
      msg(
        `Pole \`${fieldName}\` zawiera niepoprawny JSON: ${message}`,
        `Field \`${fieldName}\` contains invalid JSON: ${message}`,
      ),
    )
  }
  if (!isRecordObject(parsed)) {
    throw new Error(msg(`Pole \`${fieldName}\` musi byc obiektem JSON.`, `Field \`${fieldName}\` must be a JSON object.`))
  }
  return structuredClone(parsed)
}

// ── Params type ──────────────────────────────────────────────

export interface FlowBuilderMutationsParams {
  // Domain hook results (read)
  schemas: LoadedSchema[]
  selectedNode: BuilderNode | null
  selectedId: string | null
  nodes: BuilderNode[]
  edges: BuilderEdge[]
  queryOverridesByNode: Record<string, QueryConfig>

  // Derived state (read)
  derived: FlowBuilderDerivedState

  // Domain setters (write)
  setNodes: React.Dispatch<React.SetStateAction<BuilderNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<BuilderEdge[]>>
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  counterRef: React.RefObject<number>
  setFnOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, FnOverrides>>>
  setSetOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>
  setHeaderOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  setWaitOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setWireFormatOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, StageWireFormat>>>
  setStateOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>
  setRepeatOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, RepeatOverrides>>>
  setQueryOverridesByNode: React.Dispatch<React.SetStateAction<Record<string, QueryConfig>>>
  setWorkflowState: React.Dispatch<React.SetStateAction<WorkflowState>>
  setIsFunctionStudioOpen: React.Dispatch<React.SetStateAction<boolean>>
  setStudioSelectedField: React.Dispatch<React.SetStateAction<string | null>>

  // Reset helpers
  resetMeta: (next: FlowBuilderBootstrap) => void
  resetOverrides: (next: FlowBuilderBootstrap) => void
  initial: FlowBuilderBootstrap
  initialCounter: number
}

// ── Return type ──────────────────────────────────────────────

export interface FlowBuilderMutations {
  updateSelectedNode: (patch: Partial<BuilderNodeData>) => void
  updateSelectedNodeEvent: (schemaEvent: string) => void
  handleAddStep: (schemaEvent: string) => void
  handleAddQueryStep: (query: QueryConfig) => void
  removeStageById: (nodeId: string) => void
  removeSelectedStage: () => void
  handleReset: () => void
  updateSelectedQuery: (query: QueryConfig) => void
  removeSelectedQuery: () => void
  setSelectedStageWireFormat: (wireFormat: StageWireFormat) => void
  clearSelectedStageWireFormat: () => void
  applyFunctionOverride: (field: string, override: FieldOverridePayload) => void
  openFunctionStudio: () => void
  updateWorkflowState: (nextState: WorkflowState) => void
  addStateMappingFromField: (
    sourceField: string,
    targetStatePath: string,
    mode: 'ref' | 'fn' | 'when',
    functionExpression?: string,
    whenValueRaw?: string,
    whenHasDefault?: boolean,
    whenDefaultRaw?: string,
  ) => void
  removeStateMapping: (statePath: string) => void
  updateSelectedRepeatConfig: (field: 'repeat' | 'repeatWhileFn' | 'repeatUntilFn', value: string) => void
  updateSelectedWait: (value: string) => void
  applySelectedStageDslRaw: (setRaw: string, stateRaw: string) => void
}

// ── Builder function ─────────────────────────────────────────

export function buildFlowBuilderMutations(params: FlowBuilderMutationsParams): FlowBuilderMutations {
  const {
    schemas, selectedNode, selectedId, nodes, edges, queryOverridesByNode, derived,
    setNodes, setEdges, setSelectedId, counterRef,
    setFnOverridesByNode, setSetOverridesByNode, setHeaderOverridesByNode,
    setWaitOverridesByNode, setWireFormatOverridesByNode,
    setStateOverridesByNode, setRepeatOverridesByNode, setQueryOverridesByNode,
    setWorkflowState, setIsFunctionStudioOpen, setStudioSelectedField,
    resetMeta, resetOverrides, initial, initialCounter,
  } = params

  // Update data fields on the currently selected node (e.g. title, source, emit).
  const updateSelectedNode = (patch: Partial<BuilderNodeData>) => {
    if (!selectedId) {
      return
    }
    setNodes((current) =>
      current.map((node) => (node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node)),
    )
  }

  // Change which event schema the selected node uses.
  const updateSelectedNodeEvent = (schemaEvent: string) => {
    if (!selectedNode) {
      return
    }
    const normalizedEvent = schemaEvent.trim()
    if (!normalizedEvent || normalizedEvent === selectedNode.data.event) {
      return
    }

    const nextSchema = schemas.find((item) => item.event === normalizedEvent)
    const nextSetDefaults = buildDefaultSetFromSchema(nextSchema)
    const nextSchemaRootFields = extractSchemaRootFields(nextSchema)

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, event: normalizedEvent } } : node,
      ),
    )
    setSetOverridesByNode((current) => {
      const withoutCurrentNode = omitNodeOverrides(current, selectedNode.id)
      return Object.keys(nextSetDefaults).length === 0
        ? withoutCurrentNode
        : {
            ...withoutCurrentNode,
            [selectedNode.id]: nextSetDefaults,
          }
    })
    setFnOverridesByNode((current) => omitNodeOverrides(current, selectedNode.id))
    setStudioSelectedField(nextSchemaRootFields[0] ?? null)
  }

  // Add a new pipeline step to the canvas.
  const handleAddStep = (schemaEvent: string) => {
    const orderedBeforeAdd = orderNodesByConnections(nodes, edges)
    const previousEndNodeId = orderedBeforeAdd[orderedBeforeAdd.length - 1]?.id ?? null
    counterRef.current += 1
    const id = `step_${counterRef.current}`
    const color = NODE_PALETTE[counterRef.current % NODE_PALETTE.length]
    const selectedSchemaForStep = schemas.find((item) => item.event === schemaEvent)
    const defaultSetValues = buildDefaultSetFromSchema(selectedSchemaForStep)

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'builder',
        position: { x: 80 + current.length * 380, y: 180 },
        data: buildNewStepData(counterRef.current, color, schemaEvent),
      },
    ])
    setSetOverridesByNode((current) => ({
      ...current,
      [id]: defaultSetValues,
    }))
    if (previousEndNodeId) {
      setEdges((current) =>
        addEdge(
          {
            id: `auto-${previousEndNodeId}-${id}`,
            source: previousEndNodeId,
            target: id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#2b8a66', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
          },
          current.filter((edge) => edge.source !== previousEndNodeId),
        ),
      )
    }
    setSelectedId(id)
  }

  // Ensure all query select state paths exist in workflowState with sensible defaults.
  const syncQueryStatePaths = (query: QueryConfig) => {
    const paths = query.select.map((s) => s.statePath.trim()).filter(Boolean)
    if (paths.length === 0) return
    setWorkflowState((current) => {
      const additions: WorkflowState = {}
      for (const path of paths) {
        if (!Object.prototype.hasOwnProperty.call(current, path)) {
          additions[path] = ''
        }
      }
      return Object.keys(additions).length > 0 ? { ...current, ...additions } : current
    })
  }

  // Add a new pipeline step with a database query configuration.
  // MVP: always inserts at position #1 (before all existing nodes) and only one
  // query node is supported per workflow — adding a second would create a second
  // dangling query branch because positioning + auto-edge logic only handles one.
  const handleAddQueryStep = (query: QueryConfig) => {
    if (Object.keys(queryOverridesByNode).length > 0) {
      return
    }
    const orderedBeforeAdd = orderNodesByConnections(nodes, edges)
    const firstNodeId = orderedBeforeAdd[0]?.id ?? null
    counterRef.current += 1
    const id = `step_${counterRef.current}`
    const color = NODE_PALETTE[counterRef.current % NODE_PALETTE.length]
    const stageName = query.collection
      ? `fetch-${query.collection}`
      : `db-query-${counterRef.current}`

    setNodes((current) => [
      {
        id,
        type: 'builder' as const,
        position: { x: 80, y: 180 },
        data: {
          title: query.collection ? `DB: ${query.collection}` : `DB Query ${counterRef.current}`,
          stage: stageName,
          event: '',
          source: 'none' as const,
          emit: false as const,
          color,
          hasQuery: true,
        },
      },
      // Shift existing nodes to the right
      ...current.map((node) => ({
        ...node,
        position: { ...node.position, x: node.position.x + 380 },
      })),
    ])
    setQueryOverridesByNode((current) => ({
      ...current,
      [id]: query,
    }))
    if (firstNodeId) {
      // Connect the new query node → first existing node
      setEdges((current) => addEdge(
        {
          id: `auto-${id}-${firstNodeId}`,
          source: id,
          target: firstNodeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2b8a66', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
        },
        current,
      ))
    }
    syncQueryStatePaths(query)
    setSelectedId(id)
  }

  // Remove a pipeline step by its node ID.
  const removeStageById = (nodeId: string) => {
    if (!nodeId || !nodes.some((node) => node.id === nodeId)) {
      return
    }

    const orderedNodes = orderNodesByConnections(nodes, edges)
    const selectedIndexInOrdered = orderedNodes.findIndex((node) => node.id === nodeId)
    const nextSelectedId =
      selectedIndexInOrdered >= 0
        ? (orderedNodes[selectedIndexInOrdered + 1]?.id ?? orderedNodes[selectedIndexInOrdered - 1]?.id ?? null)
        : null

    const incomingEdge = edges.find((edge) => edge.target === nodeId && edge.source !== nodeId)
    const outgoingEdge = edges.find((edge) => edge.source === nodeId && edge.target !== nodeId)

    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) => {
      const withoutSelected = current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

      if (!incomingEdge || !outgoingEdge || incomingEdge.source === outgoingEdge.target) {
        return withoutSelected
      }

      return addEdge(
        {
          id: `auto-${incomingEdge.source}-${outgoingEdge.target}`,
          source: incomingEdge.source,
          target: outgoingEdge.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2b8a66', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
        },
        withoutSelected.filter(
          (edge) =>
            edge.source !== incomingEdge.source &&
            edge.target !== outgoingEdge.target &&
            !(edge.source === incomingEdge.source && edge.target === outgoingEdge.target),
        ),
      )
    })

    setSelectedId((current) => (current === nodeId ? nextSelectedId : current))
    setFnOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setSetOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setHeaderOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setWaitOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setWireFormatOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setStateOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setRepeatOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setQueryOverridesByNode((current) => omitNodeOverrides(current, nodeId))
  }

  // Shortcut: remove whichever node is currently selected.
  const removeSelectedStage = () => {
    if (!selectedId) {
      return
    }
    removeStageById(selectedId)
  }

  // Reset the entire builder back to its initial state (from bootstrap).
  const handleReset = () => {
    setNodes(initial.nodes)
    setEdges(initial.edges)
    setSelectedId(null)
    counterRef.current = initialCounter
    resetMeta(initial)
    resetOverrides(initial)
  }

  // Set the binary wire format for the selected stage (protobuf only).
  const setSelectedStageWireFormat = (wireFormat: StageWireFormat) => {
    if (!selectedNode || derived.selectedSchema?.schemaType !== 'protobuf') {
      return
    }
    setWireFormatOverridesByNode((current) => ({
      ...current,
      [selectedNode.id]: wireFormat,
    }))
  }

  // Remove the wire format override for the selected stage (revert to default).
  const clearSelectedStageWireFormat = () => {
    if (!selectedNode) {
      return
    }
    setWireFormatOverridesByNode((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, selectedNode.id)) {
        return current
      }
      const next = { ...current }
      delete next[selectedNode.id]
      return next
    })
  }

  // Apply a function/literal/ref override to a specific field on the selected node.
  const applyFunctionOverride = (field: string, override: FieldOverridePayload) => {
    if (!selectedNode) {
      return
    }
    setFnOverridesByNode((current) => ({
      ...current,
      [selectedNode.id]: {
        ...(current[selectedNode.id] ?? {}),
        [field]: override,
      },
    }))
  }

  // Open the function studio drawer and auto-select the first field.
  const openFunctionStudio = () => {
    setIsFunctionStudioOpen(true)
    setStudioSelectedField(derived.setFieldOptions[0] ?? null)
  }

  // Replace the entire workflow state object. Also cleans up any
  // state overrides that reference state paths that no longer exist.
  const updateWorkflowState = (nextState: WorkflowState) => {
    setWorkflowState(nextState)
    const allowedStatePaths = new Set(Object.keys(nextState))
    setStateOverridesByNode((current) => {
      let hasChanges = false
      const nextOverrides: Record<string, Record<string, unknown>> = {}

      Object.entries(current).forEach(([nodeId, mappings]) => {
        const filteredEntries = Object.entries(mappings).filter(([statePath]) => allowedStatePaths.has(statePath))
        if (filteredEntries.length !== Object.keys(mappings).length) {
          hasChanges = true
        }
        if (filteredEntries.length > 0) {
          nextOverrides[nodeId] = Object.fromEntries(filteredEntries)
        } else if (Object.keys(mappings).length > 0) {
          hasChanges = true
        }
      })

      return hasChanges ? nextOverrides : current
    })
  }

  // Create a new state mapping for the selected node.
  const addStateMappingFromField = (
    sourceField: string,
    targetStatePath: string,
    mode: 'ref' | 'fn' | 'when',
    functionExpression?: string,
    whenValueRaw?: string,
    whenHasDefault?: boolean,
    whenDefaultRaw?: string,
  ) => {
    if (!selectedNode) {
      return
    }
    const normalizedStatePath = targetStatePath.trim()
    if (!normalizedStatePath) {
      return
    }
    const nextValue =
      mode === 'fn'
        ? { $fn: normalizeFunctionCallExpression(functionExpression ?? '') || 'now()' }
        : mode === 'when'
          ? {
              when: { $fn: functionExpression?.trim() || 'eq(1,1)' },
              value: parseRawDslValue(whenValueRaw),
              ...(whenHasDefault ? { default: parseRawDslValue(whenDefaultRaw) } : {}),
            }
          : { $ref: sourceField }

    setStateOverridesByNode((current) => ({
      ...current,
      [selectedNode.id]: {
        ...(current[selectedNode.id] ?? {}),
        [normalizedStatePath]: nextValue,
      },
    }))

    setWorkflowState((current) => {
      if (Object.prototype.hasOwnProperty.call(current, normalizedStatePath)) {
        return current
      }
      const sourceRootField = sourceField.trim().split(/[.[\]]/)[0] ?? ''
      const sourceHint =
        mode === 'ref' && sourceRootField ? derived.selectedEventSchemaLiteralKindHints[sourceRootField] : undefined

      return {
        ...current,
        [normalizedStatePath]: resolveWorkflowStateDefaultFromHint(sourceHint),
      }
    })
  }

  // Remove a state mapping from the selected node.
  const removeStateMapping = (statePath: string) => {
    if (!selectedNode) {
      return
    }
    setStateOverridesByNode((current) => {
      const currentNodeOverrides = current[selectedNode.id] ?? {}
      if (!Object.prototype.hasOwnProperty.call(currentNodeOverrides, statePath)) {
        return current
      }
      const nextNodeOverrides = { ...currentNodeOverrides }
      delete nextNodeOverrides[statePath]
      return {
        ...current,
        [selectedNode.id]: nextNodeOverrides,
      }
    })
  }

  // Update the repeat/loop configuration for the selected node.
  const updateSelectedRepeatConfig = (
    field: 'repeat' | 'repeatWhileFn' | 'repeatUntilFn',
    value: string,
  ) => {
    if (!selectedNode) {
      return
    }
    setRepeatOverridesByNode((current) => {
      const currentNodeConfig = current[selectedNode.id] ?? {}
      const nextNodeConfig: RepeatOverrides = { ...currentNodeConfig }
      const trimmed = value.trim()

      if (field === 'repeat') {
        let nextRepeatValue: number | undefined
        if (!trimmed) {
          nextNodeConfig.repeat = null
          nextRepeatValue = undefined
        } else {
          const parsed = Number(trimmed)
          const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
          nextNodeConfig.repeat = normalized
          nextRepeatValue = normalized
        }
        setNodes((nodesCurrent) =>
          nodesCurrent.map((node) =>
            node.id === selectedNode.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    repeat: nextRepeatValue,
                  },
                }
              : node,
          ),
        )
      } else if (field === 'repeatWhileFn') {
        nextNodeConfig.repeatWhileFn = trimmed ? trimmed : null
      } else if (field === 'repeatUntilFn') {
        nextNodeConfig.repeatUntilFn = trimmed ? trimmed : null
      }

      return {
        ...current,
        [selectedNode.id]: nextNodeConfig,
      }
    })
  }

  // Update the wait duration for the selected node.
  const updateSelectedWait = (value: string) => {
    if (!selectedNode) {
      return
    }
    const trimmed = value.trim()
    setWaitOverridesByNode((current) => {
      if (!trimmed) {
        if (!Object.prototype.hasOwnProperty.call(current, selectedNode.id)) {
          return current
        }
        const next = { ...current }
        delete next[selectedNode.id]
        return next
      }
      if (current[selectedNode.id] === trimmed) {
        return current
      }
      return {
        ...current,
        [selectedNode.id]: trimmed,
      }
    })
  }

  // Apply raw DSL JSON to the selected node.
  const applySelectedStageDslRaw = (setRaw: string, stateRaw: string) => {
    if (!selectedNode) {
      throw new Error(msg('Brak zaznaczonego etapu.', 'No stage selected.'))
    }
    const nodeId = selectedNode.id
    const parsedSet = normalizeFnCallsInDslBlock(parseRawJsonObject(setRaw, 'set'))
    const parsedState = normalizeFnCallsInDslBlock(parseRawJsonObject(stateRaw, 'state'))

    setFnOverridesByNode((current) => omitNodeOverrides(current, nodeId))
    setSetOverridesByNode((current) => {
      const next = omitNodeOverrides(current, nodeId)
      return Object.keys(parsedSet).length === 0 ? next : { ...next, [nodeId]: parsedSet }
    })
    setStateOverridesByNode((current) => {
      const next = omitNodeOverrides(current, nodeId)
      return Object.keys(parsedState).length === 0 ? next : { ...next, [nodeId]: parsedState }
    })
  }

  // Save the database query configuration for the selected query node.
  const updateSelectedQuery = (query: QueryConfig) => {
    if (!selectedId || !queryOverridesByNode[selectedId]) return
    setQueryOverridesByNode((current) => ({
      ...current,
      [selectedId]: query,
    }))
    syncQueryStatePaths(query)
  }

  // Remove the database query configuration from the selected query node.
  const removeSelectedQuery = () => {
    if (!selectedId || !queryOverridesByNode[selectedId]) return
    setQueryOverridesByNode((current) => omitNodeOverrides(current, selectedId))
    setNodes((current) =>
      current.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, hasQuery: false } } : n)),
    )
  }

  return {
    updateSelectedNode,
    updateSelectedNodeEvent,
    handleAddStep,
    handleAddQueryStep,
    removeStageById,
    removeSelectedStage,
    handleReset,
    updateSelectedQuery,
    removeSelectedQuery,
    setSelectedStageWireFormat,
    clearSelectedStageWireFormat,
    applyFunctionOverride,
    openFunctionStudio,
    updateWorkflowState,
    addStateMappingFromField,
    removeStateMapping,
    updateSelectedRepeatConfig,
    updateSelectedWait,
    applySelectedStageDslRaw,
  }
}
