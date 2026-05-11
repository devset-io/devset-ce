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
import type { FlowBuilderState as FlowBuilderEngineState } from '../../../engine/useFlowBuilderState'
import type { useFlowBuilderPersistence } from '../../../engine/useFlowBuilderPersistence'
import type {
  BuilderCanvasPanelViewData,
  BuilderSidebarViewData,
  FlowBuilderCanvasState,
  FlowBuilderCanvasViewData,
} from '../state/FlowBuilderCanvas.types'

type PersistenceResult = ReturnType<typeof useFlowBuilderPersistence>

export function useFlowBuilderCanvasSelectors(
  state: FlowBuilderCanvasState,
  builderState: FlowBuilderEngineState,
  persistence: PersistenceResult,
  hasUnsavedSidebarChanges: boolean,
): FlowBuilderCanvasViewData {
  const sidebarViewData = useMemo<BuilderSidebarViewData>(
    () => ({
      workflowId: builderState.workflowId,
      hasUnsavedChanges: persistence.hasUnsavedChanges || hasUnsavedSidebarChanges,
      isSchemaLoading: builderState.isSchemaLoading,
      schemaError: builderState.schemaError,
      schemasCount: builderState.schemas.length,
      selectedNode: builderState.selectedNode,
      workflowStateFields: Object.keys(builderState.workflowState).length,
      payloadDraftError: builderState.payloadDraftError,
      existingFunctionsCount: builderState.existingFunctions.length,
      isSaving: state.isSaving,
      openSection: state.openSection,
      repeatDraft: state.repeatDraft,
      showRepeatWhile: state.showRepeatWhile,
      showRepeatUntil: state.showRepeatUntil,
      waitDraft: state.waitDraft,
      emitDraft: state.emitDraft,
      inspectorDraft: state.inspectorDraft,
      selectedQueryConfig: (() => {
        const entries = Object.entries(builderState.queryOverridesByNode)
        return entries.length > 0 ? entries[0][1] : null
      })(),
      queryNodeStage: (() => {
        const queryNode = builderState.nodes.find((n) => n.data.hasQuery)
        return queryNode?.data.stage ?? ''
      })(),
    }),
    [
      builderState.workflowId,
      builderState.isSchemaLoading,
      builderState.schemaError,
      builderState.schemas.length,
      builderState.selectedNode,
      builderState.nodes,
      builderState.workflowState,
      builderState.payloadDraftError,
      builderState.existingFunctions.length,
      persistence.hasUnsavedChanges,
      hasUnsavedSidebarChanges,
      state.isSaving,
      state.openSection,
      state.repeatDraft,
      state.showRepeatWhile,
      state.showRepeatUntil,
      state.waitDraft,
      state.emitDraft,
      state.inspectorDraft,
      builderState.queryOverridesByNode,
    ],
  )

  const canvasViewData = useMemo<BuilderCanvasPanelViewData>(
    () => ({
      nodes: builderState.nodes,
      edges: builderState.edges,
      canAddStep: !builderState.isSchemaLoading && builderState.schemas.length > 0,
      workflowStateFields: Object.keys(builderState.workflowState).length,
      pipelineStateFields: builderState.pipelineStateFields,
      stateLinksCountByNodeId: builderState.stateLinksCountByNodeId,
    }),
    [
      builderState.nodes,
      builderState.edges,
      builderState.isSchemaLoading,
      builderState.schemas.length,
      builderState.workflowState,
      builderState.pipelineStateFields,
      builderState.stateLinksCountByNodeId,
    ],
  )

  return useMemo<FlowBuilderCanvasViewData>(
    () => ({
      builderState,
      sidebarViewData,
      canvasViewData,
      hasUnsavedChanges: persistence.hasUnsavedChanges,
      isPayloadEditorOpen: state.isPayloadEditorOpen,
      isAddStepModalOpen: state.isAddStepModalOpen,
      isDbQueryEditorOpen: state.isDbQueryEditorOpen,
      isDeleteStageModalOpen: state.pendingDeleteStage !== null,
      deleteStageName: state.pendingDeleteStage?.stage ?? '',
    }),
    [
      builderState,
      sidebarViewData,
      canvasViewData,
      persistence.hasUnsavedChanges,
      state.isPayloadEditorOpen,
      state.isAddStepModalOpen,
      state.isDbQueryEditorOpen,
      state.pendingDeleteStage,
    ],
  )
}
