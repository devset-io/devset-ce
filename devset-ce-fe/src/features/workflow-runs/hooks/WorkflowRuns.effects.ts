/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
  loadKafkaConnectorState,
  onKafkaConnectorStateChange,
  setActiveConnectorForRuns,
} from '../services/run-config.service'
import { loadConnectorSuggestions } from '../../../shared/services/kafka-connectors.service'
import type { ConnectorStatus } from '../../../shared/services/kafka-connectors.service'
import { loadExistingWorkflows, loadWorkflowById } from '../../flow-builder'
import { normalizeError } from '../../../shared/utils/error'
import { getWorkflowRunStatus } from '../services/workflow-run-execution.service'
import { mapHeaderRowsFromWorkflow, mapKeysFromWorkflow, toUiRunStatus } from '../workflow-runs.utils'
import { handleStartRun, handleStopRun, handleSaveHeaders } from './WorkflowRuns.effects.runs'
import type { RunEffectDeps } from './WorkflowRuns.effects.runs'
import type { WorkflowRunsAction, WorkflowRunsState, WorkflowRunsViewData } from '../state/WorkflowRuns.types'
import type { WorkflowRunsHookLabels } from '../types/workflowRuns.view.types'
import type { RunEventsResponse } from '../services/workflow-run-execution.service'

/** Dependencies required by the workflow runs effect handlers. */
export interface WorkflowRunsEffectDeps {
  labels: WorkflowRunsHookLabels
  isCreateRoute: boolean
  routeRunId: string | undefined
  onOpenRun: (runId: string) => void
  refreshRuns: () => void
  refreshRunEvents: (runId: string, signal: AbortSignal, full: boolean) => void
  runAbortControllerRef: MutableRefObject<AbortController | null>
  runEvents: RunEventsResponse | null
  selectedExecutionIndex: number | null
  setSelectedExecutionIndex: (index: number) => void
}

/** Dispatches side effects in response to workflow runs actions. */
export function useWorkflowRunsEffects(
  state: WorkflowRunsState,
  dispatch: (action: WorkflowRunsAction) => void,
  lastActionRef: MutableRefObject<WorkflowRunsAction | null>,
  viewData: WorkflowRunsViewData,
  deps: WorkflowRunsEffectDeps,
): void {
  const topicAbortRef = useRef<AbortController | null>(null)
  const connectorsRef = useRef(state.connectorState.connectors)
  useEffect(() => {
    connectorsRef.current = state.connectorState.connectors
  }, [state.connectorState.connectors])

  function fetchConnectorSuggestions(connectorName: string, connectors?: ConnectorStatus[]) {
    topicAbortRef.current?.abort()
    const controller = new AbortController()
    topicAbortRef.current = controller
    const allConnectors = connectors ?? connectorsRef.current
    const connector = allConnectors.find((c) => c.name === connectorName)
    if (!connector) return
    void loadConnectorSuggestions(connector, controller.signal, {
      onTopics: (name, topics) => dispatch({ type: 'topicSuggestionsLoaded', connectorName: name, topics }),
      onRabbitResources: (name, queues, exchanges) =>
        dispatch({ type: 'rabbitBrokerResourcesLoaded', connectorName: name, queues, exchanges }),
    })
  }

  const runEffectDeps: RunEffectDeps = {
    labels: deps.labels,
    onOpenRun: deps.onOpenRun,
    refreshRuns: deps.refreshRuns,
    refreshRunEvents: deps.refreshRunEvents,
    runAbortControllerRef: deps.runAbortControllerRef,
  }

  // Action-driven effect — runs after every render, processes lastActionRef
  useEffect(() => {
    const action = lastActionRef.current
    lastActionRef.current = null
    if (!action) return

    switch (action.type) {
      case 'init':
        void handleInit(dispatch, deps.labels).then((selected) => {
          if (selected) fetchConnectorSuggestions(selected.name, selected.connectors)
        })
        break
      case 'startRun':
        void handleStartRun(state, dispatch, runEffectDeps)
        break
      case 'stopRun':
        void handleStopRun(state, dispatch, runEffectDeps)
        break
      case 'saveHeaders':
        void handleSaveHeaders(state, dispatch, deps.labels)
        break
      case 'connectorSelected':
        if (action.name.trim()) {
          setActiveConnectorForRuns(action.name)
          fetchConnectorSuggestions(action.name, state.connectorState.connectors)
        }
        break
    }
  })

  // Connector state subscription
  useEffect(() => {
    return onKafkaConnectorStateChange(async (change) => {
      if (change.type === 'active_connector_changed') {
        dispatch({ type: 'connectorActiveChanged', activeConnectorName: change.activeConnectorName })
        if (change.activeConnectorName) {
          fetchConnectorSuggestions(change.activeConnectorName)
        }
      } else {
        try {
          const nextState = await loadKafkaConnectorState()
          dispatch({ type: 'connectorStateLoaded', connectorState: nextState })
        } catch (error) {
          dispatch({
            type: 'connectorStateLoadFailed',
            error: normalizeError(error, deps.labels.errors.loadConnectorState),
          })
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, deps.labels.errors.loadConnectorState])

  // Route synchronization
  useEffect(() => {
    if (deps.isCreateRoute) {
      dispatch({ type: 'routeCreateNew' })
      return
    }
    if (!deps.routeRunId) {
      dispatch({ type: 'routeHome' })
      return
    }
    dispatch({ type: 'routeOpenRun', runId: deps.routeRunId })
    const controller = new AbortController()
    void loadRouteRunStatus(dispatch, deps.routeRunId, controller.signal, deps.labels)
    return () => {
      controller.abort()
    }
  }, [deps.isCreateRoute, deps.routeRunId, dispatch, deps.labels])

  // Workflow preview loading
  useEffect(() => {
    if (!state.workflowName) return
    let cancelled = false
    void (async () => {
      try {
        const workflow = await loadWorkflowById(state.workflowName)
        if (!cancelled) {
          dispatch({
            type: 'workflowPreviewLoaded',
            dsl: workflow,
            headerRows: mapHeaderRowsFromWorkflow(workflow),
            keys: mapKeysFromWorkflow(workflow),
          })
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'workflowPreviewFailed',
            error: normalizeError(error, deps.labels.errors.loadWorkflowPreview),
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.workflowName, dispatch, deps.labels.errors.loadWorkflowPreview])

  // Clear params modal when connector is not Kafka
  useEffect(() => {
    if (!viewData.isKafkaConnector && state.editingParamsStageIndex !== null) {
      dispatch({ type: 'editParamsClosed' })
    }
  }, [viewData.isKafkaConnector, state.editingParamsStageIndex, dispatch])

  // Auto-select first execution when run events arrive
  useEffect(() => {
    if (!deps.runEvents || deps.runEvents.executions.length === 0) return
    if (deps.selectedExecutionIndex === null) {
      deps.setSelectedExecutionIndex(deps.runEvents.executions[0].executionIndex)
      return
    }
    if (!deps.runEvents.executions.some((e) => e.executionIndex === deps.selectedExecutionIndex)) {
      deps.setSelectedExecutionIndex(deps.runEvents.executions[0].executionIndex)
    }
  }, [deps])
}

/** Loads initial connector and workflow data on mount. Returns selected connector info for topic loading. */
async function handleInit(
  dispatch: (action: WorkflowRunsAction) => void,
  labels: WorkflowRunsHookLabels,
): Promise<{ name: string; connectors: ConnectorStatus[] } | null> {
  const connectorResult = await loadKafkaConnectorState().catch((error: unknown) => {
    dispatch({
      type: 'connectorStateLoadFailed',
      error: normalizeError(error, labels.errors.loadConnectorState),
    })
    return null
  })

  try {
    const workflows = await loadExistingWorkflows()
    const cs = connectorResult ?? { connectors: [], activeConnectorName: null }
    dispatch({ type: 'initSuccess', workflows, connectorState: cs })
    const selectedName = cs.activeConnectorName ?? cs.connectors[0]?.name
    return selectedName ? { name: selectedName, connectors: cs.connectors } : null
  } catch (error) {
    dispatch({ type: 'initFailed', error: normalizeError(error, labels.errors.loadRunConfig) })
    return null
  }
}

/** Resolves a run ID from the URL route and loads its status. */
async function loadRouteRunStatus(
  dispatch: (action: WorkflowRunsAction) => void,
  runId: string,
  signal: AbortSignal,
  labels: WorkflowRunsHookLabels,
): Promise<void> {
  try {
    const snapshot = await getWorkflowRunStatus(runId, signal)
    dispatch({
      type: 'routeRunStatusLoaded',
      status: toUiRunStatus(snapshot.status),
      errorMessage: snapshot.errorMessage ?? null,
    })
  } catch (error) {
    if (!signal.aborted) {
      dispatch({
        type: 'routeRunStatusFailed',
        error: normalizeError(error, labels.errors.loadRunStatus),
      })
    }
  }
}
