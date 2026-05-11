/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { useFlowBuilderPersistence } from '../../../engine/useFlowBuilderPersistence'
import type { useFlowBuilderState } from '../../../engine/useFlowBuilderState'
import type { EmitValue, WorkflowState } from '../../../types/flowBuilder.types'
import type { EmitMode, FlowBuilderCanvasAction, FlowBuilderCanvasState } from '../state/FlowBuilderCanvas.types'

// ──────────────────────────────────────────────────────────────
// Module-scope helpers (pure functions, never re-created)
// ──────────────────────────────────────────────────────────────

const getEmitMode = (emit: EmitValue | undefined): EmitMode => {
  if (emit && typeof emit === 'object' && '$fn' in emit) return 'fn'
  if (emit === true) return 'true'
  if (emit === false) return 'false'
  return 'null'
}

const getEmitFn = (emit: EmitValue | undefined): string => {
  if (emit && typeof emit === 'object' && '$fn' in emit) return emit.$fn
  return ''
}

const toEmitValue = (mode: EmitMode, expression: string): EmitValue => {
  if (mode === 'true') return true
  if (mode === 'false') return false
  if (mode === 'null') return null
  return { $fn: expression.trim() || 'eq(1,1)' }
}

export function useFlowBuilderCanvasSidebarSync(
  builderState: ReturnType<typeof useFlowBuilderState>,
  dispatch: (action: FlowBuilderCanvasAction) => void,
  prevSelectedIdRef: RefObject<string | null>,
): void {
  useEffect(() => {
    const currentId = builderState.selectedNode?.id ?? null
    if (currentId === prevSelectedIdRef.current) return
    prevSelectedIdRef.current = currentId

    if (!builderState.selectedNode) return

    const node = builderState.selectedNode
    const emit = node.data.emit
    dispatch({
      type: 'sidebarNodeSelected',
      repeatConfig: {
        repeat: builderState.selectedRepeatConfig?.repeat ?? '',
        repeatWhileFn: builderState.selectedRepeatConfig?.repeatWhileFn ?? '',
        repeatUntilFn: builderState.selectedRepeatConfig?.repeatUntilFn ?? '',
      },
      wait: builderState.selectedWait,
      emitMode: getEmitMode(emit),
      emitFn: getEmitFn(emit),
      title: node.data.title,
      stage: node.data.stage,
      showRepeatWhile: Boolean(builderState.selectedRepeatConfig?.repeatWhileFn?.trim()),
      showRepeatUntil: Boolean(builderState.selectedRepeatConfig?.repeatUntilFn?.trim()),
    })
  }, [builderState.selectedNode, builderState.selectedRepeatConfig, builderState.selectedWait, dispatch, prevSelectedIdRef])
}

export function useFlowBuilderCanvasDispatch(
  dispatch: (action: FlowBuilderCanvasAction) => void,
  stateRef: RefObject<FlowBuilderCanvasState>,
  builderStateRef: RefObject<ReturnType<typeof useFlowBuilderState>>,
  persistenceRef: RefObject<ReturnType<typeof useFlowBuilderPersistence>>,
  hasUnsavedSidebarChangesRef: RefObject<boolean>,
  t: (key: string, params?: Record<string, string | number>) => string,
  navigate: ReturnType<typeof useNavigate>,
): (action: FlowBuilderCanvasAction) => void {
  // ── Helper: apply dirty sidebar drafts to builderState ──

  const applyDraftsToBuilderState = () => {
    const bs = builderStateRef.current
    const st = stateRef.current
    if (!bs.selectedNode) return

    if (st.repeatDirty) {
      bs.updateSelectedRepeatConfig('repeat', st.repeatDraft.repeat)
      bs.updateSelectedRepeatConfig('repeatWhileFn', st.showRepeatWhile ? st.repeatDraft.repeatWhileFn : '')
      bs.updateSelectedRepeatConfig('repeatUntilFn', st.showRepeatUntil ? st.repeatDraft.repeatUntilFn : '')
    }
    if (st.waitDirty) {
      bs.updateSelectedWait(st.waitDraft)
    }
    if (st.emitDirty) {
      bs.updateSelectedNode({ emit: toEmitValue(st.emitDraft.mode, st.emitDraft.fn) })
    }
    if (st.inspectorDirty) {
      bs.updateSelectedNode({ title: st.inspectorDraft.title, stage: st.inspectorDraft.stage })
    }
  }

  // ── Helper: save workflow state ──

  const saveWorkflowState = async (nextState: WorkflowState): Promise<void> => {
    builderStateRef.current.updateWorkflowState(nextState)
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 0) })
    await persistenceRef.current.saveWithToast()
  }

  // ──────────────────────────────────────────────────────────────
  // dispatchWithEffects — single entry point for all actions.
  //
  // Side effects are handled SYNCHRONOUSLY here, not in useEffect.
  // This avoids a critical bug: when the reducer returns the same
  // state reference (for effect-only actions like nodeSelected,
  // openFunctionStudio, etc.), React skips the re-render, so a
  // useEffect would never fire.
  //
  // We use refs to read the latest builderState/persistence/state
  // so this callback doesn't need to be recreated on every render.
  // ──────────────────────────────────────────────────────────────

  return useCallback((action: FlowBuilderCanvasAction): void => {
    const bs = builderStateRef.current
    const ps = persistenceRef.current

    // 1. Dispatch to reducer first (state changes)
    dispatch(action)

    // 2. Handle side effects synchronously
    switch (action.type) {
      // --- Modal side effects ---
      case 'openAddStepModal':
        if (bs.schemas.length === 0) {
          toast.error(t('flow.schema.missing'))
          dispatch({ type: 'closeAddStepModal' })
        }
        return
      case 'confirmAddStep':
        bs.handleAddStep(action.schemaEvent)
        return
      case 'openPlayground':
        navigate('/playground', {
          state: { incomingDslPayload: bs.payload },
        })
        return
      case 'confirmDeleteStage': {
        // Read pendingDeleteStage from the ref (set by prior requestDeleteStage action)
        const pending = stateRef.current.pendingDeleteStage
        if (pending) {
          bs.removeStageById(pending.nodeId)
        }
        dispatch({ type: 'clearPendingDeleteStage' })
        return
      }

      // --- Save ---
      case 'saveDefinition':
        void ps.saveWithToast()
        return

      // --- Workflow state ---
      case 'saveWorkflowState':
        void saveWorkflowState(action.state)
        return

      // --- Selected node mutations ---
      case 'selectedNodeSourceChanged':
        bs.updateSelectedNode({ source: action.source })
        return
      case 'selectedNodeSchemaChanged': {
        bs.updateSelectedNodeEvent(action.schemaEvent)
        const schemaType = bs.schemas.find((s) => s.event === action.schemaEvent)?.schemaType ?? null
        if (schemaType !== 'protobuf') {
          bs.clearSelectedStageWireFormat()
        }
        return
      }

      // --- Workflow state editor ---
      case 'openWorkflowStateEditor':
        bs.setIsWorkflowStateEditorOpen(true)
        return
      case 'closeWorkflowStateEditor':
        bs.setIsWorkflowStateEditorOpen(false)
        return

      // --- Function studio ---
      case 'selectStudioField':
        bs.setStudioSelectedField(action.field)
        return
      case 'closeFunctionStudio':
        bs.setIsFunctionStudioOpen(false)
        return
      case 'openFunctionStudio':
        bs.openFunctionStudio()
        return

      // --- Canvas user actions ---
      case 'nodeSelected':
        bs.setSelectedId(action.nodeId)
        return
      case 'nodeDoubleClicked': {
        bs.setSelectedId(action.nodeId)
        if (bs.queryOverridesByNode[action.nodeId]) {
          dispatch({ type: 'openDbQueryEditor' })
        } else {
          bs.openFunctionStudio()
        }
        return
      }
      case 'resetBuilder':
        bs.handleReset()
        return

      // --- Workflow ID ---
      case 'workflowIdChanged':
        bs.setWorkflowId(action.value)
        return

      // --- DB query ---
      case 'saveDbQuery':
        if (action.isEdit) {
          bs.updateSelectedQuery(action.query)
        } else if (Object.keys(bs.queryOverridesByNode).length > 0) {
          toast.error(t('flow.query.onlyOneQuerySupported'))
          dispatch({ type: 'closeDbQueryEditor' })
          return
        } else {
          bs.handleAddQueryStep(action.query)
        }
        dispatch({ type: 'closeDbQueryEditor' })
        void (async () => {
          await new Promise<void>((resolve) => { window.setTimeout(resolve, 0) })
          await ps.saveWithToast()
        })()
        return
      case 'removeDbQuery':
        bs.removeSelectedQuery()
        dispatch({ type: 'closeDbQueryEditor' })
        return

      // --- Sidebar inspector live preview ---
      case 'sidebarInspectorChanged':
        bs.updateSelectedNode({ [action.field]: action.value })
        return

      // --- Sidebar save flow ---
      case 'sidebarSaveRequested':
        void (async () => {
          try {
            if (bs.selectedNode && hasUnsavedSidebarChangesRef.current) {
              applyDraftsToBuilderState()
              await new Promise<void>((resolve) => { window.setTimeout(resolve, 0) })
            }
            await ps.saveWithToast()
            dispatch({ type: 'sidebarSaveCompleted' })
          } catch {
            // Intentional: save failure dispatches state update — error is shown via toast in saveWithToast
            dispatch({ type: 'sidebarSaveFailed' })
          }
        })()
        return

      default:
        return
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, navigate])
}
