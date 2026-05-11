/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import { buildDslStageFromNode } from '../config/node-palette.config'
import { readValueAtPath } from '../path-utils'
import {
  extractSchemaRequiredRootFields,
  extractSchemaRootFields,
  extractSchemaRootLiteralKindHints,
} from '../utils/schema-extraction.utils'
import { toSetEntries } from '../utils/set-entry.utils'
import type {
  BuilderEdge,
  BuilderNode,
  DslStage,
  FnOverrides,
  LoadedSchema,
  QueryConfig,
  RepeatOverrides,
  SetEntry,
  StageWireFormat,
} from '../types'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderDerived
//
// Custom hook that computes ALL derived / cross-domain values
// from the domain hook results. Everything is wrapped in a
// single useMemo so it only recomputes when inputs change.
// ──────────────────────────────────────────────────────────────

// ── Domain result shapes (input) ─────────────────────────────

export interface NodesDomainRead {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
  selectedId: string | null
  selectedNode: BuilderNode | null
  sortedNodes: BuilderNode[]
}

export interface OverridesDomainRead {
  fnOverridesByNode: Record<string, FnOverrides>
  setOverridesByNode: Record<string, Record<string, unknown>>
  headerOverridesByNode: Record<string, Record<string, string>>
  waitOverridesByNode: Record<string, string>
  wireFormatOverridesByNode: Record<string, StageWireFormat>
  stateOverridesByNode: Record<string, Record<string, unknown>>
  repeatOverridesByNode: Record<string, RepeatOverrides>
  queryOverridesByNode: Record<string, QueryConfig>
}

// ── Output shape ─────────────────────────────────────────────

export interface FlowBuilderDerivedState {
  stagesByNodeId: Map<string, DslStage>
  pipeline: DslStage[]
  stateLinksCountByNodeId: Record<string, number>
  pipelineStateFields: number
  selectedIndex: number
  selectedStage: DslStage | null
  selectedStageWireFormat: StageWireFormat | null
  selectedSchema: LoadedSchema | undefined
  selectedEventSchemaRequiredRootFields: string[]
  setEntries: SetEntry[]
  setFieldOptions: string[]
  selectedEventSchemaRootFields: string[]
  selectedEventSchemaLiteralKindHints: Record<string, 'string' | 'number' | 'boolean' | 'null' | 'json'>
  selectedInheritedFields: string[]
  existingFunctions: SetEntry[]
  selectedFieldEntry: SetEntry | null
  selectedFieldExpression: string | null
  selectedRepeatConfig: { repeat: string; repeatWhileFn: string; repeatUntilFn: string } | null
  selectedWait: string
}

// ── Module-scope helper ──────────────────────────────────────

// Safely read a $fn expression from an object, or return empty string.
const readFnExpression = (candidate: Record<string, unknown> | undefined) =>
  candidate && typeof candidate.$fn === 'string' ? candidate.$fn : ''

// ── Hook ─────────────────────────────────────────────────────

export function useFlowBuilderDerived(
  nodesDomain: NodesDomainRead,
  overridesDomain: OverridesDomainRead,
  schemas: LoadedSchema[],
  studioSelectedField: string | null,
): FlowBuilderDerivedState {
  const {
    sortedNodes, selectedNode,
  } = nodesDomain
  const {
    fnOverridesByNode, setOverridesByNode, headerOverridesByNode,
    waitOverridesByNode, wireFormatOverridesByNode, stateOverridesByNode,
    repeatOverridesByNode, queryOverridesByNode,
  } = overridesDomain

  return useMemo(() => {
    // Build a DSL stage object for each node by combining the node
    // data with all 7 types of overrides.
    const stagesByNodeId = new Map(
      sortedNodes.map((node, index) => [
        node.id,
        buildDslStageFromNode(node, index, {
          fnOverrides: fnOverridesByNode[node.id],
          setOverride: setOverridesByNode[node.id],
          headerOverride: headerOverridesByNode[node.id],
          waitOverride: waitOverridesByNode[node.id],
          wireFormatOverride: wireFormatOverridesByNode[node.id],
          stateOverrides: stateOverridesByNode[node.id],
          repeatOverrides: repeatOverridesByNode[node.id],
          queryOverride: queryOverridesByNode[node.id],
        }),
      ]),
    )

    // The pipeline is the stages in execution order (same order as sortedNodes).
    const pipeline: DslStage[] = sortedNodes.map((node) => stagesByNodeId.get(node.id) as DslStage) // SAFETY: node.id is guaranteed to exist in stagesByNodeId by prior construction in the same memo

    // Count how many state mappings each node has (shown as a badge on the node).
    const stateLinksCountByNodeId = Object.fromEntries(
      sortedNodes.map((node) => {
        const count = Object.keys((stagesByNodeId.get(node.id) as DslStage).state ?? {}).length // SAFETY: node.id is guaranteed to exist in stagesByNodeId by prior construction in the same memo
        return [node.id, count]
      }),
    ) as Record<string, number> // SAFETY: Object.fromEntries loses type precision; entries are [string, number] pairs

    // Total number of state mappings across ALL stages.
    const pipelineStateFields = pipeline.reduce((total, stage) => total + Object.keys(stage.state ?? {}).length, 0)

    // ── Selected node derived data ──

    // Position of the selected node in the sorted pipeline order.
    const selectedIndex = selectedNode ? sortedNodes.findIndex((node) => node.id === selectedNode.id) : -1

    // The full DSL stage object for the selected node.
    const selectedStage =
      selectedNode && selectedIndex >= 0 ? (stagesByNodeId.get(selectedNode.id) as DslStage) : null // SAFETY: selectedNode.id verified present in stagesByNodeId by selectedIndex >= 0 check

    // Wire format config (only relevant for protobuf schemas).
    const selectedStageWireFormat = selectedStage?.wireFormat ?? null

    // The schema that matches the selected node's event name.
    const selectedSchema = selectedNode ? schemas.find((item) => item.event === selectedNode.data.event) : undefined

    // Required root fields from the selected node's schema.
    const selectedEventSchemaRequiredRootFields = selectedNode ? extractSchemaRequiredRootFields(selectedSchema) : []

    // Flatten the selected stage's "set" block into a list of entries.
    const setEntries = selectedStage?.set ? toSetEntries(selectedStage.set, new Set(selectedEventSchemaRequiredRootFields)) : []

    // Just the field names from setEntries.
    const setFieldOptions = setEntries.map((entry) => entry.field)

    // All root field names from the schema.
    const selectedEventSchemaRootFields = selectedNode
      ? extractSchemaRootFields(selectedSchema)
      : []

    // Type hints for each root field.
    const selectedEventSchemaLiteralKindHints = selectedNode
      ? extractSchemaRootLiteralKindHints(selectedSchema)
      : {}

    // Fields that the selected node "inherits" from the previous step.
    const selectedInheritedFields = (() => {
      if (!selectedNode || selectedIndex <= 0) {
        return [] as string[] // SAFETY: empty array needs explicit string[] type for flatMap return
      }
      const previousNode = sortedNodes[selectedIndex - 1]
      const previousSchema = schemas.find((item) => item.event === previousNode.data.event)
      const inheritedFromSchema = extractSchemaRootFields(previousSchema)
      if (inheritedFromSchema.length > 0) {
        return inheritedFromSchema
      }
      const previousStage = stagesByNodeId.get(previousNode.id)
      if (!previousStage) {
        return [] as string[] // SAFETY: empty array needs explicit string[] type for flatMap return
      }
      return Array.from(
        new Set(
          toSetEntries(previousStage.set ?? {})
            .map((entry) => entry.field.split(/[.[\]]/)[0])
            .filter((field): field is string => Boolean(field)),
        ),
      )
    })()

    // Fields in the selected stage that use a $fn expression.
    const existingFunctions = setEntries.filter((entry) => entry.kind === 'fn')

    // The setEntry object for the field currently selected in function studio.
    const selectedFieldEntry = setEntries.find((entry) => entry.field === studioSelectedField) ?? null

    // If the selected field is a $fn expression, extract the raw expression string.
    const selectedFieldExpression =
      selectedStage && studioSelectedField
        ? (() => {
            const value = readValueAtPath(selectedStage.set ?? {}, studioSelectedField)
            if (
              value &&
              typeof value === 'object' &&
              '$fn' in value &&
              typeof (value as { $fn?: unknown }).$fn === 'string' // SAFETY: accessing optional property on confirmed object value
            ) {
              return String((value as { $fn: string }).$fn) // SAFETY: $fn confirmed as string by typeof check on line 222
            }
            return null
          })()
        : null

    // Repeat/loop configuration for the selected stage.
    const selectedRepeatConfig = selectedStage
      ? {
          repeat: selectedStage.repeat ? String(selectedStage.repeat) : '',
          repeatWhileFn: readFnExpression(selectedStage.repeatWhile),
          repeatUntilFn: readFnExpression(selectedStage.repeatUntil),
        }
      : null

    // Wait duration for the selected stage.
    const selectedWait = selectedStage?.wait ?? ''

    return {
      stagesByNodeId,
      pipeline,
      stateLinksCountByNodeId,
      pipelineStateFields,
      selectedIndex,
      selectedStage,
      selectedStageWireFormat,
      selectedSchema,
      selectedEventSchemaRequiredRootFields,
      setEntries,
      setFieldOptions,
      selectedEventSchemaRootFields,
      selectedEventSchemaLiteralKindHints,
      selectedInheritedFields,
      existingFunctions,
      selectedFieldEntry,
      selectedFieldExpression,
      selectedRepeatConfig,
      selectedWait,
    }
  }, [
    sortedNodes,
    selectedNode,
    fnOverridesByNode,
    setOverridesByNode,
    headerOverridesByNode,
    waitOverridesByNode,
    wireFormatOverridesByNode,
    stateOverridesByNode,
    repeatOverridesByNode,
    queryOverridesByNode,
    schemas,
    studioSelectedField,
  ])
}
