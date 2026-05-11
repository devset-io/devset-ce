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
// Playground types — single source of truth
//
// This file defines the complete state shape, all possible
// actions (as a discriminated union), and the ViewData type
// that the page component passes down to child components.
//
// Rule: ALL types for this page live here — never inline
// them in hooks or components.
// ──────────────────────────────────────────────────────────────

import type { DslPayload, ExistingWorkflowOption } from '../../../../flow-builder/types'
import type { ExecutionPlanRunEventsResponse, PlaygroundSourceMode } from '../../../types/playground.types'
import type { EventSearchScope, PipelineMonitoringViewModel, StageSelection } from '../../../types/pipelineMonitoring.types'
import type { PlaygroundLabels, PlaygroundProps } from '../../../types/playground.view.types'

// Re-export so other Playground files can import everything from one place.
export type { DslPayload, ExistingWorkflowOption, ExecutionPlanRunEventsResponse, PlaygroundSourceMode }
export type { EventSearchScope, PipelineMonitoringViewModel, StageSelection }
export type { PlaygroundLabels, PlaygroundProps }

// ──────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────

/**
 * Full state for the Playground page.
 *
 * The first group of fields comes from the workflow / JSON source selection
 * and the preview execution. The second group drives the pipeline monitoring
 * panel (stage strip, event log, payload search).
 */
export interface PlaygroundState {
  // -- Source selection & workflow catalog --
  sourceMode: PlaygroundSourceMode
  workflows: ExistingWorkflowOption[]
  selectedWorkflowId: string
  isLoadingWorkflows: boolean

  // -- JSON editor --
  customDslRaw: string        // the committed JSON that will be sent on preview
  customDslDraft: string      // the live draft inside the modal editor
  isJsonModalOpen: boolean

  // -- Incoming payload from Flow Builder --
  isFromFlowBuilder: boolean
  incomingFlowId: string | null

  // -- Preview execution --
  isPreviewLoading: boolean
  error: string | null
  previewResult: ExecutionPlanRunEventsResponse | null
  lastSimulatedPayload: DslPayload | null

  // -- Pipeline monitoring --
  activeStageSelection: StageSelection
  activeEventIndex: number
  eventSearch: string
  eventSearchScope: EventSearchScope
  payloadSearch: string
  activePayloadMatchIndex: number
}

// ──────────────────────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────────────────────

/**
 * Discriminated union of every action the Playground page can dispatch.
 *
 * Actions are grouped by feature area. "Side-effect-only" actions at the
 * bottom do not change state in the reducer — they only trigger async work
 * inside the hook's useEffect.
 */
export type PlaygroundAction =
  // -- Source selection --
  | { type: 'sourceModeChanged'; mode: PlaygroundSourceMode }
  | { type: 'workflowSelected'; workflowId: string }
  | { type: 'workflowsLoaded'; workflows: ExistingWorkflowOption[]; currentId: string }
  | { type: 'workflowsLoadFailed'; error: string }

  // -- JSON editor --
  | { type: 'jsonModalOpened'; currentDslRaw: string }
  | { type: 'jsonModalClosed' }
  | { type: 'draftChanged'; value: string }
  | { type: 'draftReset'; defaultDsl: string }
  | { type: 'draftSaved' }

  // -- Preview --
  | { type: 'previewStarted' }
  | { type: 'previewCompleted'; result: ExecutionPlanRunEventsResponse; payload: DslPayload }
  | { type: 'previewFailed'; error: string }

  // -- Incoming payload from Flow Builder --
  | {
      type: 'incomingPayloadProcessed'
      sourceMode: PlaygroundSourceMode
      workflowId: string
      dslRaw: string
      isFromFlowBuilder: boolean
      flowId: string | null
    }

  // -- Pipeline monitoring --
  | { type: 'stageSelected'; selection: StageSelection }
  | { type: 'eventSelected'; index: number }
  | { type: 'eventSearchChanged'; value: string }
  | { type: 'eventSearchScopeChanged'; scope: EventSearchScope }
  | { type: 'payloadSearchChanged'; value: string }
  | { type: 'previousPayloadMatch'; totalMatches: number }
  | { type: 'nextPayloadMatch'; totalMatches: number }

  // -- Initialization (sets isLoadingWorkflows, then triggers async bootstrap) --
  | { type: 'init' }

  // -- Side-effect-only (no state change in reducer) --
  | { type: 'preview' }
  | { type: 'backToBuilder' }

// ──────────────────────────────────────────────────────────────
// ViewData — the shape of data passed from the hook to the page
// component and then down to child components via props.
//
// This keeps the page component thin — it just forwards
// viewData fields and callbacks without knowing the internals.
// ──────────────────────────────────────────────────────────────

export interface PlaygroundViewData {
  // -- Source & workflow --
  sourceMode: PlaygroundSourceMode
  workflows: ExistingWorkflowOption[]
  selectedWorkflowId: string
  isLoadingWorkflows: boolean

  // -- Preview --
  isPreviewLoading: boolean
  error: string | null

  // -- Derived display values --
  originNote: string | null
  canPreview: boolean

  // -- JSON modal --
  isJsonModalOpen: boolean
  customDslDraft: string

  // -- Pipeline monitoring (fully built view model, or null if no data) --
  monitoring: PipelineMonitoringViewModel | null
}
