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
// Playground selectors — derived state (useMemo only)
//
// This file contains ONLY useMemo hooks. No side effects,
// no dispatch, no useEffect, no useCallback, no external hooks.
// It takes the raw reducer state and a translation function,
// and computes everything the UI needs to render.
// ──────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { groupExecutionEventsByStage } from '../../../../../shared/services/execution-plan-events.service'
import type { PipelineMonitoringData } from '../../../types/pipelineMonitoring.types'
import type { PlaygroundLabels, PlaygroundState } from '../state/Playground.types'
import { buildPlaygroundLabels } from '../PlaygroundPage.labels'

// ──────────────────────────────────────────────────────────────
// Result type — the shape returned by this hook
// ──────────────────────────────────────────────────────────────

export type PlaygroundSelectorResult = {
  labels: PlaygroundLabels
  monitoringData: PipelineMonitoringData | null
  monitoringSubtitle: string
  originNote: string | null
  canPreview: boolean
}

// ──────────────────────────────────────────────────────────────
// Selector hook
// ──────────────────────────────────────────────────────────────

/**
 * Derives all computed / display values from the raw reducer state.
 *
 * Every useMemo in this hook transforms a slice of PlaygroundState
 * into something the UI needs. The hook composition layer (hooks.ts)
 * combines these results with usePipelineMonitoring and callbacks
 * to build the final view data.
 *
 * @param state - current reducer state (read-only)
 * @param t     - i18n translation function
 * @returns PlaygroundSelectorResult — derived data only, no callbacks
 */
export function usePlaygroundSelectors(
  state: PlaygroundState,
  t: (key: string) => string,
): PlaygroundSelectorResult {

  // ── 1. Build and memoize i18n labels ──
  const labels = useMemo(() => buildPlaygroundLabels(t), [t])

  // ── 2. Group the flat event list into pipeline stages ──
  const monitoringData = useMemo<PipelineMonitoringData | null>(() => {
    if (!state.previewResult) return null

    const events = state.previewResult.executions.flatMap((ex) => ex.events)
    if (events.length === 0) return null

    return groupExecutionEventsByStage(events)
  }, [state.previewResult])

  // ── 3. Build the subtitle for the monitoring panel header ──
  const monitoringSubtitle = useMemo(
    () => state.previewResult
      ? `runId: ${state.previewResult.runId} | status: ${state.previewResult.status}`
      : '',
    [state.previewResult],
  )

  // ── 4. Origin note — small banner telling the user where the payload came from ──
  const originNote = useMemo(() => {
    if (state.sourceMode !== 'json' || !state.isFromFlowBuilder) return null

    return state.incomingFlowId
      ? labels.originFlowBuilderWithId.replace('{id}', state.incomingFlowId)
      : labels.originFlowBuilder
  }, [state.sourceMode, state.isFromFlowBuilder, state.incomingFlowId, labels])

  // ── 5. Can the user click "Preview"? ──
  const canPreview = useMemo(
    () => state.sourceMode === 'json' || state.selectedWorkflowId.length > 0,
    [state.sourceMode, state.selectedWorkflowId],
  )

  return { labels, monitoringData, monitoringSubtitle, originNote, canPreview }
}
