/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useState } from 'react'
import { createEmptyBootstrap } from '../services/workflow-bootstrap.service'
import { useFlowBuilderSchemas } from './useFlowBuilderSchemas'
import { useFlowBuilderNodes } from './useFlowBuilderNodes'
import { useFlowBuilderOverrides } from './useFlowBuilderOverrides'
import { useFlowBuilderWorkflowMeta } from './useFlowBuilderWorkflowMeta'
import { useFlowBuilderPayload } from './useFlowBuilderPayload'
import { useFlowBuilderDerived } from './useFlowBuilderDerived'
import { buildFlowBuilderMutations } from './buildFlowBuilderMutations'
import type { DslPayload, FlowBuilderBootstrap } from '../types'

// ════════════════════════════════════════════════════════════════
// useFlowBuilderState – THIN COMPOSITION HOOK
//
// Wires together all domain hooks, derived state, and mutations.
// Contains no business logic – just plumbing.
//
// The return type (FlowBuilderState) has NOT changed, so all
// consumers (FlowBuilderCanvas, FunctionStudio, etc.) work
// without any modifications.
// ════════════════════════════════════════════════════════════════

export function useFlowBuilderState(bootstrap?: FlowBuilderBootstrap) {
  const initial = bootstrap ?? createEmptyBootstrap()
  const initialCounter = initial.nodes.reduce((maxValue, node) => {
    const match = /^step_(\d+)$/.exec(node.id)
    return match ? Math.max(maxValue, Number(match[1])) : maxValue
  }, initial.nodes.length)

  // 1. Domain hooks
  const schemasDomain = useFlowBuilderSchemas()
  const nodesDomain = useFlowBuilderNodes(initial.nodes, initial.edges, initialCounter)
  const overridesDomain = useFlowBuilderOverrides(initial)
  const metaDomain = useFlowBuilderWorkflowMeta(initial)
  const [isFunctionStudioOpen, setIsFunctionStudioOpen] = useState(false)
  const [studioSelectedField, setStudioSelectedField] = useState<string | null>(null)

  // 2. Derived state (memoized)
  const derived = useFlowBuilderDerived(nodesDomain, overridesDomain, schemasDomain.schemas, studioSelectedField)

  // 3. Payload
  const payload: DslPayload = {
    id: metaDomain.workflowId,
    producerName: metaDomain.producerName,
    topic: metaDomain.topic,
    executions: metaDomain.executions,
    state: metaDomain.workflowState,
    pipeline: derived.pipeline,
  }
  const payloadDomain = useFlowBuilderPayload(payload)

  // 4. Effect: auto-select first field on node change
  useEffect(() => {
    setStudioSelectedField(derived.setFieldOptions[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesDomain.selectedId])

  // 5. Mutations
  const mutations = buildFlowBuilderMutations({
    schemas: schemasDomain.schemas,
    selectedNode: nodesDomain.selectedNode,
    selectedId: nodesDomain.selectedId,
    nodes: nodesDomain.nodes,
    edges: nodesDomain.edges,
    queryOverridesByNode: overridesDomain.queryOverridesByNode,
    derived,
    setNodes: nodesDomain.setNodes,
    setEdges: nodesDomain.setEdges,
    setSelectedId: nodesDomain.setSelectedId,
    counterRef: nodesDomain.counterRef,
    setFnOverridesByNode: overridesDomain.setFnOverridesByNode,
    setSetOverridesByNode: overridesDomain.setSetOverridesByNode,
    setHeaderOverridesByNode: overridesDomain.setHeaderOverridesByNode,
    setWaitOverridesByNode: overridesDomain.setWaitOverridesByNode,
    setWireFormatOverridesByNode: overridesDomain.setWireFormatOverridesByNode,
    setStateOverridesByNode: overridesDomain.setStateOverridesByNode,
    setRepeatOverridesByNode: overridesDomain.setRepeatOverridesByNode,
    setQueryOverridesByNode: overridesDomain.setQueryOverridesByNode,
    setWorkflowState: metaDomain.setWorkflowState,
    setIsFunctionStudioOpen,
    setStudioSelectedField,
    resetMeta: metaDomain.resetMeta,
    resetOverrides: overridesDomain.resetOverrides,
    initial,
    initialCounter,
  })

  // 6. Public API (same shape as before the refactor)
  return {
    nodes: nodesDomain.nodes,
    edges: nodesDomain.edges,
    onNodesChange: nodesDomain.onNodesChange,
    onEdgesChange: nodesDomain.onEdgesChange,
    handleConnect: nodesDomain.handleConnect,
    setSelectedId: nodesDomain.setSelectedId,
    selectedNode: nodesDomain.selectedNode,
    workflowId: metaDomain.workflowId,
    setWorkflowId: metaDomain.setWorkflowId,
    isSchemaLoading: schemasDomain.isSchemaLoading,
    schemaError: schemasDomain.schemaError,
    schemas: schemasDomain.schemas,
    workflowState: metaDomain.workflowState,
    isWorkflowStateEditorOpen: metaDomain.isWorkflowStateEditorOpen,
    setIsWorkflowStateEditorOpen: metaDomain.setIsWorkflowStateEditorOpen,
    pipelineStateFields: derived.pipelineStateFields,
    stateLinksCountByNodeId: derived.stateLinksCountByNodeId,
    availableEvents: schemasDomain.availableEvents,
    payload,
    payloadDraft: payloadDomain.payloadDraft,
    isPayloadDraftDirty: payloadDomain.isPayloadDraftDirty,
    payloadDraftError: payloadDomain.payloadDraftError,
    updatePayloadDraft: payloadDomain.updatePayloadDraft,
    formatPayloadDraft: payloadDomain.formatPayloadDraft,
    resetPayloadDraftFromBuilder: payloadDomain.resetPayloadDraftFromBuilder,
    isFunctionStudioOpen,
    setIsFunctionStudioOpen,
    setEntries: derived.setEntries,
    setFieldOptions: derived.setFieldOptions,
    selectedSchema: derived.selectedSchema,
    selectedEventSchemaRootFields: derived.selectedEventSchemaRootFields,
    selectedEventSchemaLiteralKindHints: derived.selectedEventSchemaLiteralKindHints,
    selectedEventSchemaRequiredRootFields: derived.selectedEventSchemaRequiredRootFields,
    selectedInheritedFields: derived.selectedInheritedFields,
    selectedFieldEntry: derived.selectedFieldEntry,
    selectedFieldRawValue: derived.selectedFieldEntry?.rawValue,
    selectedFieldExpression: derived.selectedFieldExpression,
    selectedRepeatConfig: derived.selectedRepeatConfig,
    selectedWait: derived.selectedWait,
    selectedStageDsl: derived.selectedStage,
    selectedStageState: derived.selectedStage?.state ?? {},
    selectedStageWireFormat: derived.selectedStageWireFormat,
    studioSelectedField,
    setStudioSelectedField,
    fnOverridesByNode: overridesDomain.fnOverridesByNode,
    queryOverridesByNode: overridesDomain.queryOverridesByNode,
    setQueryOverridesByNode: overridesDomain.setQueryOverridesByNode,
    existingFunctions: derived.existingFunctions,
    ...mutations,
  }
}

// The public type is inferred from the return object above.
// All consumers import this type – it has NOT changed after the refactor.
export type FlowBuilderState = ReturnType<typeof useFlowBuilderState>
