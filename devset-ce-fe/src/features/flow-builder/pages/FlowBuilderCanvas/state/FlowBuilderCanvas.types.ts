/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FlowBuilderState as FlowBuilderEngineState } from '../../../engine/useFlowBuilderState'
import type { BuilderEdge, BuilderNode, BuilderNodeData, QueryConfig, WorkflowState } from '../../../types'

// ──────────────────────────────────────────────────────────────
// Pending delete stage – used by the confirmation modal.
// ──────────────────────────────────────────────────────────────

export type PendingDeleteStage = {
  nodeId: string
  stage: string
} | null

// ──────────────────────────────────────────────────────────────
// Sidebar draft types – these used to live as 8 useState hooks
// inside BuilderSidebar. Moving them to the page reducer
// eliminates the render loop caused by the unsaved-changes
// broadcast effect.
// ──────────────────────────────────────────────────────────────

export type SidebarSection = 'repeat' | 'wait' | 'emit' | 'inspector'
export type EmitMode = 'true' | 'false' | 'null' | 'fn'

export type RepeatDraft = {
  repeat: string
  repeatWhileFn: string
  repeatUntilFn: string
}

export type EmitDraft = {
  mode: EmitMode
  fn: string
}

export type InspectorDraft = {
  title: string
  stage: string
}

// ──────────────────────────────────────────────────────────────
// Page-level reducer state
// ──────────────────────────────────────────────────────────────

export interface FlowBuilderCanvasState {
  // Modal state
  isPayloadEditorOpen: boolean
  isAddStepModalOpen: boolean
  isDbQueryEditorOpen: boolean
  pendingDeleteStage: PendingDeleteStage

  // Sidebar draft state (moved from BuilderSidebar's useState hooks)
  openSection: SidebarSection | null
  repeatDraft: RepeatDraft
  showRepeatWhile: boolean
  showRepeatUntil: boolean
  waitDraft: string
  emitDraft: EmitDraft
  inspectorDraft: InspectorDraft
  repeatDirty: boolean
  waitDirty: boolean
  emitDirty: boolean
  inspectorDirty: boolean
  isSaving: boolean
}

// ──────────────────────────────────────────────────────────────
// Page-level action union
//
// Every user interaction dispatches one of these actions.
// The reducer handles pure state transitions; the hook
// handles side effects (API calls, navigation, etc.)
// ──────────────────────────────────────────────────────────────

export type FlowBuilderCanvasAction =
  // --- Modal actions ---
  | { type: 'openAddStepModal' }
  | { type: 'closeAddStepModal' }
  | { type: 'confirmAddStep'; schemaEvent: string }
  | { type: 'openPayloadEditor' }
  | { type: 'closePayloadEditor' }
  | { type: 'openPlayground' }
  | { type: 'requestDeleteStage'; nodeId: string; stage: string }
  | { type: 'cancelDeleteStage' }
  | { type: 'confirmDeleteStage' }
  | { type: 'clearPendingDeleteStage' }

  // --- DB query editor ---
  | { type: 'openDbQueryEditor' }
  | { type: 'closeDbQueryEditor' }
  | { type: 'saveDbQuery'; query: QueryConfig; isEdit: boolean }
  | { type: 'removeDbQuery' }

  // --- Save/persist actions ---
  | { type: 'saveDefinition' }

  // --- Workflow state editor ---
  | { type: 'openWorkflowStateEditor' }
  | { type: 'closeWorkflowStateEditor' }
  | { type: 'saveWorkflowState'; state: WorkflowState }

  // --- Selected node mutations (routed to builderState in hook) ---
  | { type: 'selectedNodeSourceChanged'; source: BuilderNodeData['source'] }
  | { type: 'selectedNodeSchemaChanged'; schemaEvent: string }

  // --- Function studio ---
  | { type: 'selectStudioField'; field: string | null }
  | { type: 'closeFunctionStudio' }
  | { type: 'openFunctionStudio' }

  // --- Canvas user actions ---
  | { type: 'nodeSelected'; nodeId: string | null }
  | { type: 'nodeDoubleClicked'; nodeId: string }
  | { type: 'resetBuilder' }

  // --- Workflow ID ---
  | { type: 'workflowIdChanged'; value: string }

  // --- Sidebar section toggling ---
  | { type: 'sidebarSectionToggled'; section: SidebarSection; open: boolean }

  // --- Sidebar draft mutations ---
  | { type: 'sidebarRepeatDraftChanged'; field: 'repeat' | 'repeatWhileFn' | 'repeatUntilFn'; value: string }
  | { type: 'sidebarRepeatWhileToggled'; show: boolean }
  | { type: 'sidebarRepeatUntilToggled'; show: boolean }
  | { type: 'sidebarWaitDraftChanged'; value: string }
  | { type: 'sidebarEmitModeChanged'; mode: EmitMode }
  | { type: 'sidebarEmitFnChanged'; value: string }
  | { type: 'sidebarInspectorChanged'; field: 'title' | 'stage'; value: string }

  // --- Sidebar node selection reset (dispatched by hook when selectedId changes) ---
  | {
      type: 'sidebarNodeSelected'
      repeatConfig: RepeatDraft
      wait: string
      emitMode: EmitMode
      emitFn: string
      title: string
      stage: string
      showRepeatWhile: boolean
      showRepeatUntil: boolean
    }

  // --- Sidebar save flow ---
  | { type: 'sidebarSaveRequested' }
  | { type: 'sidebarSaveCompleted' }
  | { type: 'sidebarSaveFailed' }

// ──────────────────────────────────────────────────────────────
// ViewData types – data bags passed to child components
// ──────────────────────────────────────────────────────────────

// Data bag for BuilderSidebar (replaces 20+ individual props).
export interface BuilderSidebarViewData {
  workflowId: string
  hasUnsavedChanges: boolean
  isSchemaLoading: boolean
  schemaError: string | null
  schemasCount: number
  selectedNode: BuilderNode | null
  workflowStateFields: number
  payloadDraftError: string | null
  existingFunctionsCount: number
  isSaving: boolean
  openSection: SidebarSection | null
  repeatDraft: RepeatDraft
  showRepeatWhile: boolean
  showRepeatUntil: boolean
  waitDraft: string
  emitDraft: EmitDraft
  inspectorDraft: InspectorDraft
  selectedQueryConfig: QueryConfig | null
  queryNodeStage: string
}

// Data bag for BuilderCanvasPanel (replaces ~14 individual props).
// ReactFlow handlers (onNodesChange, onEdgesChange, onConnect) are
// passed separately because they fire on every drag frame.
export interface BuilderCanvasPanelViewData {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
  canAddStep: boolean
  workflowStateFields: number
  pipelineStateFields: number
  stateLinksCountByNodeId: Record<string, number>
}

// Top-level viewData passed from the hook to the page component.
export interface FlowBuilderCanvasViewData {
  builderState: FlowBuilderEngineState
  sidebarViewData: BuilderSidebarViewData
  canvasViewData: BuilderCanvasPanelViewData
  hasUnsavedChanges: boolean
  isPayloadEditorOpen: boolean
  isAddStepModalOpen: boolean
  isDbQueryEditorOpen: boolean
  isDeleteStageModalOpen: boolean
  deleteStageName: string
}
