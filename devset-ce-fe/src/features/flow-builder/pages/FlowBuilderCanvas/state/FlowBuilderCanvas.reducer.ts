/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FlowBuilderCanvasAction, FlowBuilderCanvasState } from './FlowBuilderCanvas.types'

// ──────────────────────────────────────────────────────────────
// Pure reducer – handles all state transitions for the canvas
// page, including sidebar draft state that was previously
// managed by 8 useState hooks inside BuilderSidebar.
//
// This eliminates the render loop that was caused by
// BuilderSidebar broadcasting unsaved changes via useEffect.
// Now dirty flags live directly in the reducer state, and
// hasUnsavedSidebarChanges is derived in the hook.
// ──────────────────────────────────────────────────────────────

export function reducer(
  state: FlowBuilderCanvasState,
  action: FlowBuilderCanvasAction,
): FlowBuilderCanvasState {
  switch (action.type) {
    // --- Modal state ---
    case 'openAddStepModal':
      return { ...state, isAddStepModalOpen: true }
    case 'closeAddStepModal':
    case 'confirmAddStep':
      return { ...state, isAddStepModalOpen: false }
    case 'openPayloadEditor':
      return { ...state, isPayloadEditorOpen: true }
    case 'closePayloadEditor':
      return { ...state, isPayloadEditorOpen: false }
    case 'openDbQueryEditor':
      return { ...state, isDbQueryEditorOpen: true }
    case 'closeDbQueryEditor':
      return { ...state, isDbQueryEditorOpen: false }
    case 'requestDeleteStage':
      return {
        ...state,
        pendingDeleteStage: { nodeId: action.nodeId, stage: action.stage },
      }
    case 'cancelDeleteStage':
    case 'clearPendingDeleteStage':
      return { ...state, pendingDeleteStage: null }

    // --- Sidebar section toggling (accordion – one section at a time) ---
    case 'sidebarSectionToggled':
      return { ...state, openSection: action.open ? action.section : null }

    // --- Sidebar draft mutations ---
    case 'sidebarRepeatDraftChanged':
      return {
        ...state,
        repeatDraft: { ...state.repeatDraft, [action.field]: action.value },
        repeatDirty: true,
      }
    case 'sidebarRepeatWhileToggled':
      return { ...state, showRepeatWhile: action.show, repeatDirty: true }
    case 'sidebarRepeatUntilToggled':
      return { ...state, showRepeatUntil: action.show, repeatDirty: true }
    case 'sidebarWaitDraftChanged':
      return { ...state, waitDraft: action.value, waitDirty: true }
    case 'sidebarEmitModeChanged':
      return {
        ...state,
        emitDraft: { ...state.emitDraft, mode: action.mode },
        emitDirty: true,
      }
    case 'sidebarEmitFnChanged':
      return {
        ...state,
        emitDraft: { ...state.emitDraft, fn: action.value },
        emitDirty: true,
      }
    case 'sidebarInspectorChanged':
      return {
        ...state,
        inspectorDraft: { ...state.inspectorDraft, [action.field]: action.value },
        inspectorDirty: true,
      }

    // --- Sidebar node selection reset ---
    // Dispatched by the hook when selectedId changes.
    // Resets all drafts from the newly selected node's data.
    case 'sidebarNodeSelected':
      return {
        ...state,
        openSection: null,
        repeatDraft: action.repeatConfig,
        showRepeatWhile: action.showRepeatWhile,
        showRepeatUntil: action.showRepeatUntil,
        waitDraft: action.wait,
        emitDraft: { mode: action.emitMode, fn: action.emitFn },
        inspectorDraft: { title: action.title, stage: action.stage },
        repeatDirty: false,
        waitDirty: false,
        emitDirty: false,
        inspectorDirty: false,
      }

    // --- Sidebar save flow ---
    case 'sidebarSaveRequested':
      return { ...state, isSaving: true }
    case 'sidebarSaveCompleted':
      return {
        ...state,
        isSaving: false,
        repeatDirty: false,
        waitDirty: false,
        emitDirty: false,
        inspectorDirty: false,
      }
    case 'sidebarSaveFailed':
      return { ...state, isSaving: false }

    // --- Actions handled purely by side effects in the hook ---
    // The reducer returns state unchanged; the hook's useEffect
    // handles the actual work (API calls, navigation, etc.).
    case 'confirmDeleteStage':
    case 'openPlayground':
    case 'saveDefinition':
    case 'saveDbQuery':
    case 'removeDbQuery':
    case 'openWorkflowStateEditor':
    case 'closeWorkflowStateEditor':
    case 'saveWorkflowState':
    case 'selectedNodeSourceChanged':
    case 'selectedNodeSchemaChanged':
    case 'selectStudioField':
    case 'closeFunctionStudio':
    case 'openFunctionStudio':
    case 'nodeSelected':
    case 'nodeDoubleClicked':
    case 'resetBuilder':
    case 'workflowIdChanged':
      return state

    default:
      return state
  }
}
