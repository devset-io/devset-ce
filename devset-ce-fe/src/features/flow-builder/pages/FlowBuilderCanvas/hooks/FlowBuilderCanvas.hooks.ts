/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { useFlowBuilderPersistence } from '../../../engine/useFlowBuilderPersistence'
import { useFlowBuilderState } from '../../../engine/useFlowBuilderState'
import { reducer } from '../state/FlowBuilderCanvas.reducer'
import { useFlowBuilderCanvasSelectors } from './FlowBuilderCanvas.selectors'
import {
  useFlowBuilderCanvasDispatch,
  useFlowBuilderCanvasSidebarSync,
} from './FlowBuilderCanvas.effects'
import type { FlowBuilderBootstrap } from '../../../types/flowBuilder.types'
import type { FlowBuilderCanvasState } from '../state/FlowBuilderCanvas.types'

function createInitialState(): FlowBuilderCanvasState {
  return {
    isPayloadEditorOpen: false,
    isAddStepModalOpen: false,
    isDbQueryEditorOpen: false,
    pendingDeleteStage: null,
    openSection: null,
    repeatDraft: { repeat: '', repeatWhileFn: '', repeatUntilFn: '' },
    showRepeatWhile: false,
    showRepeatUntil: false,
    waitDraft: '',
    emitDraft: { mode: 'true', fn: '' },
    inspectorDraft: { title: '', stage: '' },
    repeatDirty: false,
    waitDirty: false,
    emitDirty: false,
    inspectorDirty: false,
    isSaving: false,
  }
}

export function useFlowBuilderCanvas(bootstrap: FlowBuilderBootstrap) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const builderState = useFlowBuilderState(bootstrap)
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const hasUnsavedSidebarChanges = state.repeatDirty || state.waitDirty || state.emitDirty || state.inspectorDirty

  const persistence = useFlowBuilderPersistence({
    payload: builderState.payload,
    hasUnsavedSidebarChanges,
    isPayloadDraftDirty: builderState.isPayloadDraftDirty,
    initiallyPersisted: Boolean(bootstrap.isPersisted),
    onPersistedWorkflowIdChange: builderState.setWorkflowId,
  })

  // ── Refs for stable access in dispatchWithEffects ──
  // We use refs so the dispatch callback always reads the
  // latest values without needing to be recreated.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const builderStateRef = useRef(builderState)
  useEffect(() => { builderStateRef.current = builderState }, [builderState])
  const persistenceRef = useRef(persistence)
  useEffect(() => { persistenceRef.current = persistence }, [persistence])
  const hasUnsavedSidebarChangesRef = useRef(hasUnsavedSidebarChanges)
  useEffect(() => { hasUnsavedSidebarChangesRef.current = hasUnsavedSidebarChanges }, [hasUnsavedSidebarChanges])
  const prevSelectedIdRef = useRef<string | null>(null)

  const viewData = useFlowBuilderCanvasSelectors(state, builderState, persistence, hasUnsavedSidebarChanges)
  useFlowBuilderCanvasSidebarSync(builderState, dispatch, prevSelectedIdRef)
  const dispatchWithEffects = useFlowBuilderCanvasDispatch(
    dispatch, stateRef, builderStateRef, persistenceRef, hasUnsavedSidebarChangesRef, t, navigate,
  )

  return { viewData, dispatch: dispatchWithEffects }
}
