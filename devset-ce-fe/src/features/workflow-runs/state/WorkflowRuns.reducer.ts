/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { KafkaConnectorState } from '../services/run-config.service'
import type { WorkflowRunsAction, WorkflowRunsState } from './WorkflowRuns.types'

/** Creates the default initial state for workflow runs. */
export function createInitialState(): WorkflowRunsState {
  return {
    connectorState: { connectors: [], activeConnectorName: null },
    selectedConnectorName: '',
    isRunsHomeVisible: true,
    isRunFocusedMode: false,
    workflows: [],
    isLoading: true,
    error: null,
    workflowName: '',
    executionsRaw: '1',
    topicRaw: '',
    topicSuggestions: [],
    exchangeSuggestions: [],
    routingKeyRaw: '',
    exchangeRaw: '',
    headerRowsByStageIndex: {},
    keyByStageIndex: {},
    runStatus: 'idle',
    runError: null,
    selectedWorkflowDsl: null,
    workflowPreviewError: null,
    isWorkflowPreviewLoading: false,
    editingParamsStageIndex: null,
    isSavingParamsModal: false,
    currentRunId: null,
  }
}

/** Picks the connector name to select based on available connectors. */
function resolveSelectedConnectorName(
  current: string,
  next: KafkaConnectorState,
): string {
  if (current && next.connectors.some((c) => c.name === current)) {
    return current
  }
  return next.activeConnectorName ?? next.connectors[0]?.name ?? ''
}

/** Pure reducer for workflow runs state transitions. */
export function reducer(state: WorkflowRunsState, action: WorkflowRunsAction): WorkflowRunsState {
  switch (action.type) {
    case 'init':
      return { ...state, isLoading: true, error: null }

    case 'initSuccess': {
      const firstWorkflowName = action.workflows[0]?.id ?? ''
      return {
        ...state,
        isLoading: false,
        error: null,
        workflows: action.workflows,
        workflowName: firstWorkflowName,
        connectorState: action.connectorState,
        selectedConnectorName: resolveSelectedConnectorName(state.selectedConnectorName, action.connectorState),
        isWorkflowPreviewLoading: Boolean(firstWorkflowName),
      }
    }

    case 'initFailed':
      return { ...state, isLoading: false, error: action.error }

    case 'connectorStateLoaded':
      return {
        ...state,
        connectorState: action.connectorState,
        selectedConnectorName: resolveSelectedConnectorName(state.selectedConnectorName, action.connectorState),
      }

    case 'connectorStateLoadFailed':
      return { ...state, error: action.error }

    case 'connectorActiveChanged': {
      const nextConnectorState = { ...state.connectorState, activeConnectorName: action.activeConnectorName }
      const nextSelectedName = !action.activeConnectorName
        ? state.selectedConnectorName
        : state.connectorState.connectors.some((c) => c.name === action.activeConnectorName)
          ? action.activeConnectorName
          : state.selectedConnectorName
      return { ...state, connectorState: nextConnectorState, selectedConnectorName: nextSelectedName }
    }

    case 'connectorSelected':
      if (action.name === state.selectedConnectorName) return state
      return { ...state, selectedConnectorName: action.name, topicSuggestions: [], exchangeSuggestions: [] }

    case 'topicSuggestionsLoaded':
      if (action.connectorName !== state.selectedConnectorName) return state
      return { ...state, topicSuggestions: action.topics }

    case 'rabbitBrokerResourcesLoaded':
      if (action.connectorName !== state.selectedConnectorName) return state
      return { ...state, topicSuggestions: action.queues, exchangeSuggestions: action.exchanges }

    case 'routeCreateNew':
      return {
        ...state,
        isRunsHomeVisible: false,
        isRunFocusedMode: false,
        currentRunId: null,
        runStatus: 'idle',
        runError: null,
      }

    case 'routeHome':
      return {
        ...state,
        isRunsHomeVisible: true,
        isRunFocusedMode: false,
        currentRunId: null,
      }

    case 'routeOpenRun':
      return {
        ...state,
        isRunsHomeVisible: false,
        isRunFocusedMode: true,
        currentRunId: action.runId,
      }

    case 'routeRunStatusLoaded':
      return {
        ...state,
        runStatus: action.status,
        runError: action.errorMessage,
      }

    case 'routeRunStatusFailed':
      return { ...state, runError: action.error }

    case 'workflowNameChanged':
      if (!action.name) {
        return {
          ...state,
          workflowName: '',
          selectedWorkflowDsl: null,
          workflowPreviewError: null,
          isWorkflowPreviewLoading: false,
          topicRaw: '',
          routingKeyRaw: '',
          exchangeRaw: '',
          headerRowsByStageIndex: {},
          keyByStageIndex: {},
        }
      }
      return { ...state, workflowName: action.name, isWorkflowPreviewLoading: true, workflowPreviewError: null }

    case 'workflowPreviewLoaded':
      return {
        ...state,
        isWorkflowPreviewLoading: false,
        selectedWorkflowDsl: action.dsl,
        workflowPreviewError: null,
        topicRaw: '',
        routingKeyRaw: action.dsl.routingKey ?? '',
        exchangeRaw: action.dsl.exchange ?? '',
        headerRowsByStageIndex: action.headerRows,
        keyByStageIndex: action.keys,
      }

    case 'workflowPreviewFailed':
      return {
        ...state,
        isWorkflowPreviewLoading: false,
        selectedWorkflowDsl: null,
        workflowPreviewError: action.error,
        topicRaw: '',
        routingKeyRaw: '',
        exchangeRaw: '',
        headerRowsByStageIndex: {},
        keyByStageIndex: {},
      }

    case 'executionsRawChanged':
      return { ...state, executionsRaw: action.value }

    case 'topicRawChanged':
      return { ...state, topicRaw: action.value }

    case 'routingKeyRawChanged':
      return { ...state, routingKeyRaw: action.value }

    case 'exchangeRawChanged':
      return { ...state, exchangeRaw: action.value }

    case 'kafkaKeyChanged':
      return {
        ...state,
        keyByStageIndex: {
          ...state.keyByStageIndex,
          [action.stageIndex]: action.value,
        },
      }

    case 'headerRowUpdated': {
      const rows = state.headerRowsByStageIndex[action.stageIndex] ?? []
      return {
        ...state,
        headerRowsByStageIndex: {
          ...state.headerRowsByStageIndex,
          [action.stageIndex]: rows.map((row) =>
            row.id === action.rowId ? { ...row, [action.field]: action.value } : row,
          ),
        },
      }
    }

    case 'headerRowRemoved': {
      const nextRows = (state.headerRowsByStageIndex[action.stageIndex] ?? []).filter((row) => row.id !== action.rowId)
      return {
        ...state,
        headerRowsByStageIndex: {
          ...state.headerRowsByStageIndex,
          [action.stageIndex]: nextRows.length > 0 ? nextRows : [action.fallbackRow],
        },
      }
    }

    case 'headerRowAdded':
      return {
        ...state,
        headerRowsByStageIndex: {
          ...state.headerRowsByStageIndex,
          [action.stageIndex]: [...(state.headerRowsByStageIndex[action.stageIndex] ?? []), action.newRow],
        },
      }

    case 'editParamsOpened':
      return { ...state, editingParamsStageIndex: action.stageIndex }

    case 'editParamsClosed':
      return { ...state, editingParamsStageIndex: null }

    case 'startRun':
      return { ...state, runError: null, runStatus: 'running' }

    case 'runExecuteStarted':
      return {
        ...state,
        runStatus: 'running',
        currentRunId: action.runId,
        isRunFocusedMode: true,
        isRunsHomeVisible: false,
      }

    case 'runStatusUpdated':
      return { ...state, runStatus: action.status }

    case 'runCompleted':
      return { ...state, runStatus: 'completed' }

    case 'runFailed':
      return {
        ...state,
        runStatus: action.wasStarted ? 'failed' : 'idle',
        runError: action.error,
      }

    case 'runStopped':
      return { ...state, runStatus: 'stopped' }

    case 'runAborted':
      return { ...state, runStatus: 'idle' }

    case 'stopRun':
      // Spread creates new reference to ensure the effect fires
      return { ...state }

    case 'stopRunSuccess':
      return { ...state, runStatus: action.status }

    case 'stopRunRefreshed':
      return { ...state, runStatus: action.status }

    case 'stopRunFailed':
      return { ...state, runError: action.error }

    case 'saveHeaders':
      return { ...state, isSavingParamsModal: true }

    case 'saveHeadersSuccess':
      return {
        ...state,
        isSavingParamsModal: false,
        selectedWorkflowDsl: action.dsl,
        routingKeyRaw: action.dsl.routingKey ?? '',
        exchangeRaw: action.dsl.exchange ?? '',
        headerRowsByStageIndex: action.headerRows,
        keyByStageIndex: action.keys,
        editingParamsStageIndex: null,
      }

    case 'saveHeadersFailed':
      return { ...state, isSavingParamsModal: false }

    case 'externalStatusUpdate':
      return { ...state, runStatus: action.status }

    default:
      return state
  }
}
