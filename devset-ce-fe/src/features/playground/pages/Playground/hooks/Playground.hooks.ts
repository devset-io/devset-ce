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
// usePlaygroundPage — composition-only orchestration hook
//
// This hook is the "wiring" layer. It only:
//   1. Creates the reducer (useReducer)
//   2. Creates refs (useRef)
//   3. Wires selectors (derived state from useMemo)
//   4. Composes usePipelineMonitoring (shared hook)
//   5. Wires effects (side effects from useEffect)
//   6. Returns the result for the page component
//
// All the real work happens in:
//   - Playground.selectors.ts  (derived state)
//   - Playground.effects.ts    (side effects + API calls)
//   - Playground.reducer.ts    (state transitions)
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { usePipelineMonitoring } from '../../../../../shared/hooks/usePipelineMonitoring'
import type { DslPayload, PlaygroundAction, PlaygroundProps, PlaygroundState, PlaygroundViewData } from '../state/Playground.types'
import { createInitialState, DEFAULT_PLAYGROUND_DSL, reducer } from '../state/Playground.reducer'
import { usePlaygroundSelectors } from './Playground.selectors'
import { usePlaygroundEffects } from './Playground.effects'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Options accepted by the hook — injected by the page shell. */
export type UsePlaygroundPageOptions = {
  t: (key: string) => string
  incomingDslPayload: unknown
  onOpenFlowBuilderEditor: (payload: DslPayload, isPersisted: boolean) => void
  onOpenFlowBuilderHome: () => void
  onNavigateBack: () => void
}

// ──────────────────────────────────────────────────────────────
// Module-scope helper — builds callback props from dispatch
// ──────────────────────────────────────────────────────────────

/**
 * Build the callback props that the Playground component expects.
 * Each callback dispatches a single action through the reducer.
 *
 * This function lives at module scope (not inside the hook)
 * as required by CLAUDE.md rule 8.
 */
function buildCallbacks(
  dispatch: (action: PlaygroundAction) => void,
  stateRef: React.RefObject<PlaygroundState>,
): Omit<PlaygroundProps, 'labels' | keyof PlaygroundViewData> {
  return {
    onSourceModeChange: (mode) => {
      dispatch({ type: 'sourceModeChanged', mode })
    },
    onSelectedWorkflowIdChange: (workflowId) => {
      dispatch({ type: 'workflowSelected', workflowId })
    },
    onOpenJsonModal: () => {
      dispatch({ type: 'jsonModalOpened', currentDslRaw: stateRef.current.customDslRaw })
    },
    onCloseJsonModal: () => {
      dispatch({ type: 'jsonModalClosed' })
    },
    onCustomDslDraftChange: (value) => {
      dispatch({ type: 'draftChanged', value })
    },
    onResetJsonDraft: () => {
      dispatch({ type: 'draftReset', defaultDsl: DEFAULT_PLAYGROUND_DSL })
    },
    onSaveJsonDraft: () => {
      dispatch({ type: 'draftSaved' })
    },
    onPreview: () => {
      dispatch({ type: 'preview' })
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function usePlaygroundPage(options: UsePlaygroundPageOptions) {
  // 1. Reducer — single source of truth for all state.
  const [state, rawDispatch] = useReducer(reducer, undefined, createInitialState)

  // 2. Refs — let async callbacks read the latest state without stale closures.
  const stateRef = useRef<PlaygroundState>(state)
  useEffect(() => { stateRef.current = state }, [state])

  const lastAction = useRef<PlaygroundAction | null>(null)
  const processedPayloadRef = useRef<unknown>(null)

  // 3. Dispatch wrapper — stable via useCallback (rawDispatch identity is stable from useReducer).
  const dispatchWithEffects = useCallback((action: PlaygroundAction) => {
    lastAction.current = action
    rawDispatch(action)
  }, [rawDispatch])

  // 4. Stable callbacks — memoized so identity only changes if dispatch changes (never).
  // eslint-disable-next-line react-hooks/refs -- stateRef is only read inside event handler callbacks, not during memo computation
  const callbacks = useMemo(() => buildCallbacks(dispatchWithEffects, stateRef), [dispatchWithEffects])
  const onBackToBuilder = useCallback(() => dispatchWithEffects({ type: 'backToBuilder' }), [dispatchWithEffects])

  // 5. Selectors — all useMemo-derived state (pure, no hooks other than useMemo).
  const { labels, monitoringData, monitoringSubtitle, originNote, canPreview } =
    usePlaygroundSelectors(state, options.t)

  // 6. Compose usePipelineMonitoring — the shared hook also used by workflow-runs.
  const monitoring = usePipelineMonitoring({
    data: monitoringData,
    labels: labels.monitoring,
    subtitle: monitoringSubtitle,
    onBackToBuilder,
  })

  // 7. Effects — all useEffect + API calls.
  usePlaygroundEffects(
    dispatchWithEffects,
    lastAction,
    stateRef,
    processedPayloadRef,
    state.isLoadingWorkflows,
    state.workflows,
    {
      labels,
      incomingDslPayload: options.incomingDslPayload,
      onOpenFlowBuilderEditor: options.onOpenFlowBuilderEditor,
      onOpenFlowBuilderHome: options.onOpenFlowBuilderHome,
      onNavigateBack: options.onNavigateBack,
    },
  )

  // 8. Build the final view data.
  const viewData: PlaygroundViewData = {
    sourceMode: state.sourceMode,
    workflows: state.workflows,
    selectedWorkflowId: state.selectedWorkflowId,
    isLoadingWorkflows: state.isLoadingWorkflows,
    isPreviewLoading: state.isPreviewLoading,
    error: state.error,
    originNote,
    canPreview,
    isJsonModalOpen: state.isJsonModalOpen,
    customDslDraft: state.customDslDraft,
    monitoring,
  }

  return { viewData: { ...viewData, ...callbacks }, labels, dispatch: dispatchWithEffects }
}
