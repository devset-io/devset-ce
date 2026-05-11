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
// Playground reducer — pure state transitions
//
// This is the ONLY place where state changes happen.
// The reducer is a pure function: it takes the current state
// and an action, and returns the next state. It never calls
// APIs, never triggers side effects — just data in, data out.
//
// Side effects (API calls, navigation) are handled separately
// in the effects file (Playground.effects.ts).
// ──────────────────────────────────────────────────────────────

import type { PlaygroundAction, PlaygroundState } from './Playground.types'

// ──────────────────────────────────────────────────────────────
// Default DSL — the starter JSON shown in the editor
// ──────────────────────────────────────────────────────────────

/**
 * The starter JSON shown when the user has not loaded any workflow yet.
 * Exported so the effects file can reference it when resetting the draft.
 */
export const DEFAULT_PLAYGROUND_DSL = JSON.stringify(
  {
    id: 'playground-workflow',
    producerName: 'local',
    topic: '',
    executions: 1,
    state: {},
    pipeline: [
      {
        stage: 'process-entity',
        event: 'entity-updated',
        source: 'none',
        set: {},
        headers: {
          'event-type': 'entity-updated',
        },
        emit: true,
      },
    ],
  },
  null,
  2,
)

// ──────────────────────────────────────────────────────────────
// Initial state factory
// ──────────────────────────────────────────────────────────────

/**
 * Creates the initial state used by useReducer.
 * Every field has a safe default so the page can render immediately
 * without waiting for any async data to load.
 */
export function createInitialState(): PlaygroundState {
  return {
    // Source selection
    sourceMode: 'workflow',
    workflows: [],
    selectedWorkflowId: '',
    isLoadingWorkflows: false,

    // JSON editor
    customDslRaw: DEFAULT_PLAYGROUND_DSL,
    customDslDraft: DEFAULT_PLAYGROUND_DSL,
    isJsonModalOpen: false,

    // Incoming payload from Flow Builder
    isFromFlowBuilder: false,
    incomingFlowId: null,

    // Preview execution
    isPreviewLoading: false,
    error: null,
    previewResult: null,
    lastSimulatedPayload: null,

    // Pipeline monitoring
    activeStageSelection: 0,
    activeEventIndex: 0,
    eventSearch: '',
    eventSearchScope: 'both',
    payloadSearch: '',
    activePayloadMatchIndex: 0,
  }
}

// ──────────────────────────────────────────────────────────────
// Pure helpers (used inside reducer only)
// ──────────────────────────────────────────────────────────────

/**
 * Returns the default monitoring field values.
 * Used whenever the preview result changes and we need to reset the
 * monitoring panel back to its starting position (stage 0, event 0, etc.).
 */
function resetMonitoring(): Pick<
  PlaygroundState,
  'activeStageSelection' | 'activeEventIndex' | 'eventSearch' | 'eventSearchScope' | 'payloadSearch' | 'activePayloadMatchIndex'
> {
  return {
    activeStageSelection: 0,
    activeEventIndex: 0,
    eventSearch: '',
    eventSearchScope: 'both',
    payloadSearch: '',
    activePayloadMatchIndex: 0,
  }
}

/**
 * Cyclic modulo that always returns a non-negative index.
 * For example normalizeCyclicIndex(-1, 5) returns 4.
 * Used for wrapping around when the user clicks "previous" on the first match.
 */
function normalizeCyclicIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0
  }
  return ((index % length) + length) % length
}

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────

/**
 * Pure reducer — every state transition for the Playground page lives here.
 * No side effects, no API calls. Actions that only trigger async work
 * (init, preview, backToBuilder) pass through unchanged.
 */
export function reducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    // ── Source selection ──

    // The user switched between "workflow" and "json" tabs.
    // Clear any previous error and preview so the UI starts fresh.
    case 'sourceModeChanged':
      return {
        ...state,
        sourceMode: action.mode,
        error: null,
        previewResult: null,
      }

    // The user picked a different workflow from the dropdown.
    case 'workflowSelected':
      return { ...state, selectedWorkflowId: action.workflowId }

    // The workflow catalog loaded successfully.
    // If we already have a selected workflow keep it; otherwise pick the
    // first one from the freshly loaded list.
    case 'workflowsLoaded':
      return {
        ...state,
        workflows: action.workflows,
        selectedWorkflowId:
          action.currentId || action.workflows[0]?.id || '',
        isLoadingWorkflows: false,
      }

    // The workflow catalog request failed.
    case 'workflowsLoadFailed':
      return {
        ...state,
        isLoadingWorkflows: false,
        error: action.error,
      }

    // ── JSON editor modal ──

    // Open the JSON modal. We copy the committed DSL into the draft so the
    // user always starts editing from the last saved version.
    case 'jsonModalOpened':
      return {
        ...state,
        isJsonModalOpen: true,
        customDslDraft: action.currentDslRaw,
      }

    // Close the modal without saving — discard the draft silently.
    case 'jsonModalClosed':
      return { ...state, isJsonModalOpen: false }

    // The user typed inside the JSON editor.
    case 'draftChanged':
      return { ...state, customDslDraft: action.value }

    // The user clicked "Reset" in the JSON editor.
    case 'draftReset':
      return { ...state, customDslDraft: action.defaultDsl }

    // The user clicked "Save" in the JSON editor.
    // Commit the draft into customDslRaw and close the modal.
    case 'draftSaved':
      return {
        ...state,
        customDslRaw: state.customDslDraft,
        isJsonModalOpen: false,
      }

    // ── Preview execution ──

    // A preview request is about to be sent.
    case 'previewStarted':
      return { ...state, isPreviewLoading: true, error: null }

    // The preview request succeeded.
    // Store the result + the payload that produced it, then reset the
    // monitoring panel so it starts from stage 0 / event 0.
    case 'previewCompleted':
      return {
        ...state,
        isPreviewLoading: false,
        previewResult: action.result,
        lastSimulatedPayload: action.payload,
        ...resetMonitoring(),
      }

    // The preview request failed.
    case 'previewFailed':
      return {
        ...state,
        isPreviewLoading: false,
        previewResult: null,
        error: action.error,
      }

    // ── Incoming payload from Flow Builder ──

    // The hook has resolved an incoming DslPayload (from navigation state).
    case 'incomingPayloadProcessed':
      return {
        ...state,
        sourceMode: action.sourceMode,
        selectedWorkflowId: action.workflowId,
        customDslRaw: action.dslRaw,
        customDslDraft: action.dslRaw,
        isFromFlowBuilder: action.isFromFlowBuilder,
        incomingFlowId: action.flowId,
        previewResult: null,
        error: null,
      }

    // ── Pipeline monitoring — stage & event navigation ──

    // The user clicked a stage chip in the stage strip.
    // Reset event index and payload match since the event list changes.
    case 'stageSelected':
      return {
        ...state,
        activeStageSelection: action.selection,
        activeEventIndex: 0,
        activePayloadMatchIndex: 0,
      }

    // The user clicked a specific event row in the event log.
    case 'eventSelected':
      return {
        ...state,
        activeEventIndex: action.index,
        activePayloadMatchIndex: 0,
      }

    // The user typed in the event search box.
    case 'eventSearchChanged':
      return {
        ...state,
        eventSearch: action.value,
        activeEventIndex: 0,
        activePayloadMatchIndex: 0,
      }

    // The user changed the event search scope dropdown.
    case 'eventSearchScopeChanged':
      return {
        ...state,
        eventSearchScope: action.scope,
        activeEventIndex: 0,
        activePayloadMatchIndex: 0,
      }

    // ── Pipeline monitoring — payload search ──

    // The user typed in the payload search box.
    case 'payloadSearchChanged':
      return {
        ...state,
        payloadSearch: action.value,
        activePayloadMatchIndex: 0,
      }

    // Cycle backwards through payload search matches (wraps around).
    case 'previousPayloadMatch':
      return {
        ...state,
        activePayloadMatchIndex: normalizeCyclicIndex(
          state.activePayloadMatchIndex - 1,
          action.totalMatches,
        ),
      }

    // Cycle forward through payload search matches (wraps around).
    case 'nextPayloadMatch':
      return {
        ...state,
        activePayloadMatchIndex: normalizeCyclicIndex(
          state.activePayloadMatchIndex + 1,
          action.totalMatches,
        ),
      }

    // ── Side-effect-triggering actions ──
    //
    // These actions trigger async work in the effects hook.
    // Some also update state synchronously (init sets isLoadingWorkflows).

    // Mark workflows as loading immediately, then the effects hook
    // will call the API and dispatch workflowsLoaded/workflowsLoadFailed.
    case 'init':
      return { ...state, isLoadingWorkflows: true }

    // These two only trigger side effects — no synchronous state change.
    case 'preview':
    case 'backToBuilder':
      return state

    default:
      return state
  }
}
