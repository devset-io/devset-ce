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
// Playground effects — side effects & API calls (useEffect only)
//
// This file contains ONLY useEffect hooks and the async
// functions they call. No useMemo, no useRef, no derived state.
//
// All pure helper functions live at module scope (outside the hook),
// as required by CLAUDE.md rule 8.
// ──────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import type { RefObject } from 'react'
import { previewWorkflowPlayground } from '../../../services/playground-preview.service'
import {
  loadExistingWorkflows,
  loadWorkflowById,
} from '../../../../flow-builder/services/workflow-library.service'
import { normalizeError } from '../../../../../shared/utils/error'
import type { DslPayload, ExistingWorkflowOption, PlaygroundAction, PlaygroundLabels, PlaygroundState } from '../state/Playground.types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Options injected by the page shell — navigation callbacks + i18n labels. */
export type PlaygroundEffectsOptions = {
  labels: PlaygroundLabels
  incomingDslPayload: unknown
  onOpenFlowBuilderEditor: (payload: DslPayload, isPersisted: boolean) => void
  onOpenFlowBuilderHome: () => void
  onNavigateBack: () => void
}

// ──────────────────────────────────────────────────────────────
// Pure helpers (module scope — no hooks, no side effects)
// ──────────────────────────────────────────────────────────────

/** Type guard — returns true when the value looks like a valid DslPayload. */
function isDslPayload(payload: unknown): payload is DslPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }
  const candidate = payload as Record<string, unknown> // SAFETY: payload confirmed as non-null object by preceding typeof check
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.producerName === 'string' &&
    (typeof candidate.topic === 'string' || candidate.topic === null) &&
    typeof candidate.executions === 'number' &&
    Array.isArray(candidate.pipeline)
  )
}


/** Parse the raw JSON string into a DslPayload or throw. */
function parseCustomDsl(raw: string, invalidJsonMessage: string): DslPayload {
  const parsed: unknown = JSON.parse(raw)
  if (!isDslPayload(parsed)) {
    throw new Error(invalidJsonMessage)
  }
  return parsed
}

/**
 * Navigate back to Flow Builder, passing the last simulated payload.
 * Pure function — takes all needed state and callbacks as parameters.
 */
function handleBackToBuilder(
  lastSimulatedPayload: DslPayload | null,
  workflows: ExistingWorkflowOption[],
  onOpenFlowBuilderEditor: (payload: DslPayload, isPersisted: boolean) => void,
  onOpenFlowBuilderHome: () => void,
  onNavigateBack: () => void,
): void {
  if (lastSimulatedPayload) {
    const existsInCatalog = workflows.some(
      (w) => w.id === lastSimulatedPayload.id,
    )
    onOpenFlowBuilderEditor(lastSimulatedPayload, existsInCatalog)
    return
  }

  // No payload to pass back — try browser history, then fall back to home.
  if (typeof window !== 'undefined' && window.history.length > 1) {
    onNavigateBack()
    return
  }

  onOpenFlowBuilderHome()
}

// ──────────────────────────────────────────────────────────────
// Effects hook
// ──────────────────────────────────────────────────────────────

/**
 * Runs all side effects for the Playground page.
 *
 * There are two useEffect hooks here:
 *   1. Action effect — reacts to dispatched actions that need async work
 *      (init loads the workflow catalog, preview runs the simulation, etc.)
 *   2. Incoming payload effect — processes a DslPayload that arrived
 *      from Flow Builder via the router's navigation state.
 *
 * Reactive values (isLoadingWorkflows, workflows) are passed directly
 * as parameters so React can properly track them in dependency arrays.
 * The stateRef is only used inside async callbacks to avoid stale closures.
 */
export function usePlaygroundEffects(
  dispatch: (action: PlaygroundAction) => void,
  lastActionRef: RefObject<PlaygroundAction | null>,
  stateRef: RefObject<PlaygroundState>,
  processedPayloadRef: RefObject<unknown>,
  isLoadingWorkflows: boolean,
  workflows: ExistingWorkflowOption[],
  options: PlaygroundEffectsOptions,
): void {
  const {
    labels,
    incomingDslPayload,
    onOpenFlowBuilderEditor,
    onOpenFlowBuilderHome,
    onNavigateBack,
  } = options

  // ── Effect 1: React to dispatched actions ──
  //
  // The main hook dispatches actions like { type: 'init' } or { type: 'preview' }.
  // The reducer handles the synchronous state change. This effect picks up the
  // action from lastAction ref and triggers the corresponding async work.

  useEffect(() => {
    const action = lastActionRef.current
    if (!action) return
    lastActionRef.current = null // consume it so we don't re-fire

    if (action.type === 'init') {
      void bootstrap(dispatch, stateRef, labels)
    }

    if (action.type === 'preview') {
      void runPreview(dispatch, stateRef, labels)
    }

    if (action.type === 'backToBuilder') {
      const current = stateRef.current
      handleBackToBuilder(
        current.lastSimulatedPayload,
        current.workflows,
        onOpenFlowBuilderEditor,
        onOpenFlowBuilderHome,
        onNavigateBack,
      )
    }
  })

  // ── Effect 2: Incoming payload from Flow Builder ──
  //
  // When the user navigates from Flow Builder to Playground, the route state
  // carries a DslPayload. We process it once workflows are loaded (so we can
  // check if the payload's id matches an existing workflow).
  //
  // isLoadingWorkflows and workflows are reactive values passed as parameters,
  // so React properly re-runs this effect when they change.

  useEffect(() => {
    // Skip if not a valid DslPayload.
    if (!isDslPayload(incomingDslPayload)) return

    // Skip if workflows are still loading — we need the catalog first.
    if (isLoadingWorkflows) return

    // Skip if we already processed this exact reference (prevents double fire).
    if (processedPayloadRef.current === incomingDslPayload) return
    processedPayloadRef.current = incomingDslPayload

    void processIncomingPayload(dispatch, stateRef, labels, incomingDslPayload)
  }, [incomingDslPayload, isLoadingWorkflows, workflows]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ──────────────────────────────────────────────────────────────
// Async functions (module scope — called by effects, dispatch when done)
// ──────────────────────────────────────────────────────────────

/**
 * Load the workflow catalog from the API and store it in state.
 * Called when the page initializes (action type: 'init').
 */
async function bootstrap(
  dispatch: (action: PlaygroundAction) => void,
  stateRef: RefObject<PlaygroundState>,
  labels: PlaygroundLabels,
): Promise<void> {
  try {
    const catalog = await loadExistingWorkflows()
    dispatch({
      type: 'workflowsLoaded',
      workflows: catalog,
      currentId: stateRef.current.selectedWorkflowId || catalog[0]?.id || '',
    })
  } catch (error) {
    dispatch({
      type: 'workflowsLoadFailed',
      error: normalizeError(error, labels.errors.loadCatalog),
    })
  }
}

/**
 * Send the current payload (from workflow or JSON) to the preview API.
 * Called when the user clicks the "Preview" button (action type: 'preview').
 */
async function runPreview(
  dispatch: (action: PlaygroundAction) => void,
  stateRef: RefObject<PlaygroundState>,
  labels: PlaygroundLabels,
): Promise<void> {
  const current = stateRef.current

  dispatch({ type: 'previewStarted' })

  try {
    // Resolve the payload depending on the active source mode.
    const payload =
      current.sourceMode === 'workflow'
        ? await loadWorkflowById(current.selectedWorkflowId)
        : parseCustomDsl(current.customDslRaw, labels.errors.invalidJson)

    const result = await previewWorkflowPlayground(payload)
    dispatch({ type: 'previewCompleted', result, payload })
  } catch (error) {
    dispatch({
      type: 'previewFailed',
      error: normalizeError(error, labels.errors.requestFailed),
    })
  }
}

/**
 * Process a DslPayload that arrived from Flow Builder via navigation state.
 *
 * If the payload's id matches a workflow in the catalog, we stay in "workflow"
 * mode and load the persisted version. Otherwise we switch to "json" mode
 * and paste the raw JSON into the editor.
 */
async function processIncomingPayload(
  dispatch: (action: PlaygroundAction) => void,
  stateRef: RefObject<PlaygroundState>,
  labels: PlaygroundLabels,
  incoming: DslPayload,
): Promise<void> {
  const current = stateRef.current
  const maybeFlowId = incoming.id
  const existsInCatalog = current.workflows.some((w) => w.id === maybeFlowId)
  const flowId = typeof maybeFlowId === 'string' && maybeFlowId.trim() ? maybeFlowId : null

  if (existsInCatalog) {
    // The workflow exists in the catalog — try to load the persisted version.
    dispatch({
      type: 'incomingPayloadProcessed',
      sourceMode: 'workflow',
      workflowId: maybeFlowId,
      dslRaw: current.customDslRaw, // keep existing draft
      isFromFlowBuilder: true,
      flowId,
    })

    try {
      dispatch({ type: 'previewStarted' })
      const catalogPayload = await loadWorkflowById(maybeFlowId)
      const result = await previewWorkflowPlayground(catalogPayload)
      dispatch({ type: 'previewCompleted', result, payload: catalogPayload })
    } catch {
      // Intentional: persisted workflow load failed — fall back to raw incoming JSON payload
      const incomingRaw = JSON.stringify(incoming, null, 2)
      dispatch({
        type: 'incomingPayloadProcessed',
        sourceMode: 'json',
        workflowId: maybeFlowId,
        dslRaw: incomingRaw,
        isFromFlowBuilder: true,
        flowId,
      })

      dispatch({ type: 'previewStarted' })
      try {
        const result = await previewWorkflowPlayground(incoming)
        dispatch({ type: 'previewCompleted', result, payload: incoming })
      } catch (innerError) {
        dispatch({
          type: 'previewFailed',
          error: normalizeError(innerError, labels.errors.requestFailed),
        })
      }
    }
    return
  }

  // The workflow does not exist in the catalog — use JSON mode.
  const incomingRaw = JSON.stringify(incoming, null, 2)
  dispatch({
    type: 'incomingPayloadProcessed',
    sourceMode: 'json',
    workflowId: maybeFlowId,
    dslRaw: incomingRaw,
    isFromFlowBuilder: true,
    flowId,
  })

  dispatch({ type: 'previewStarted' })
  try {
    const result = await previewWorkflowPlayground(incoming)
    dispatch({ type: 'previewCompleted', result, payload: incoming })
  } catch (error) {
    dispatch({
      type: 'previewFailed',
      error: normalizeError(error, labels.errors.requestFailed),
    })
  }
}
