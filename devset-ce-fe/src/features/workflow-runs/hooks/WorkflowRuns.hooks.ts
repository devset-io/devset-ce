/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { usePipelineMonitoring } from '../../../shared/hooks/usePipelineMonitoring'
import { groupExecutionEventsByStage } from '../../../shared/services/execution-plan-events.service'
import { createClientId } from '../../../shared/utils/create-client-id'
import { toUiRunStatus, type KeyValue } from '../workflow-runs.utils'
import { createInitialState, reducer } from '../state/WorkflowRuns.reducer'
import { useWorkflowRunsSelectors } from './WorkflowRuns.selectors'
import { useWorkflowRunsEffects } from './WorkflowRuns.effects'
import { useRunEventsFeed } from './useRunEventsFeed'
import { useWorkflowPreviewGraph } from './useWorkflowPreviewGraph'
import { useWorkflowRunsList } from './useWorkflowRunsList'
import type { WorkflowRunsAction } from '../state/WorkflowRuns.types'
import type { WorkflowRunsHookLabels, WorkflowRunsProps } from '../types/workflowRuns.view.types'

type UseWorkflowRunsOptions = {
  labels: WorkflowRunsHookLabels
  routeRunId?: string
  isCreateRoute: boolean
  colorMode: 'light' | 'dark'
  onOpenRun: (runId: string) => void
  onOpenRunsHome: () => void
  onOpenNewRun: () => void
  onNavigateToRunsHome: () => void
}

/** Composes reducer, selectors, and effects for the workflow runs feature. */
export function useWorkflowRuns({
  labels,
  routeRunId,
  isCreateRoute,
  colorMode,
  onOpenRun,
  onOpenRunsHome,
  onOpenNewRun,
  onNavigateToRunsHome,
}: UseWorkflowRunsOptions): WorkflowRunsProps {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const lastActionRef = useRef<WorkflowRunsAction | null>(null)
  const runAbortControllerRef = useRef<AbortController | null>(null)

  function dispatchWithEffects(action: WorkflowRunsAction) {
    lastActionRef.current = action
    dispatch(action)
  }

  // --- Sub-hooks ---

  const { activeRuns, completedRuns, error: runsListError, refreshRuns } = useWorkflowRunsList({
    enabled: state.isRunsHomeVisible,
  })

  const handleStatusFromEvents = useCallback((status: string) => {
    dispatch({ type: 'externalStatusUpdate', status: toUiRunStatus(status) })
  }, [])

  const {
    runEvents,
    selectedExecutionIndex,
    runEventsLoading,
    runEventsError,
    setSelectedExecutionIndex,
    refreshRunEvents,
  } = useRunEventsFeed({
    currentRunId: state.currentRunId,
    runStatus: state.runStatus,
    onStatusFromEvents: handleStatusFromEvents,
  })

  const workflowGraph = useWorkflowPreviewGraph({
    selectedWorkflowDsl: state.selectedWorkflowDsl,
    topicRaw: state.topicRaw,
    headerRowsByStageIndex: state.headerRowsByStageIndex,
    keyByStageIndex: state.keyByStageIndex,
    showKafkaParams:
      Boolean(state.connectorState.connectors.find((c) => c.name === state.selectedConnectorName)?.type === 'kafka'),
    onEditParamsStage: (index: number) => dispatchWithEffects({ type: 'editParamsOpened', stageIndex: index }),
    labels: labels.previewGraph,
  })

  // --- Selectors ---

  const viewData = useWorkflowRunsSelectors(state, labels, activeRuns, completedRuns)

  // --- Effects ---

  useEffect(() => {
    dispatchWithEffects({ type: 'init' })
  }, [])

  useWorkflowRunsEffects(state, dispatch, lastActionRef, viewData, {
    labels,
    isCreateRoute,
    routeRunId,
    onOpenRun,
    refreshRuns,
    refreshRunEvents,
    runAbortControllerRef,
    runEvents,
    selectedExecutionIndex,
    setSelectedExecutionIndex,
  })

  // --- Sub-hook bridging (monitoring) ---

  const selectedExecution = useMemo(() => {
    if (!runEvents) return null
    if (selectedExecutionIndex === null) {
      return runEvents.executions[0] ?? null
    }
    return (
      runEvents.executions.find((e) => e.executionIndex === selectedExecutionIndex) ??
      runEvents.executions[0] ??
      null
    )
  }, [runEvents, selectedExecutionIndex])

  const monitoringData = useMemo(() => {
    if (!selectedExecution) return null
    return groupExecutionEventsByStage(selectedExecution.events)
  }, [selectedExecution])

  const runEventsMonitoring = usePipelineMonitoring({
    data: monitoringData,
    labels: labels.monitoring,
    subtitle:
      runEvents && selectedExecution
        ? `runId: ${runEvents.runId} | status: ${runEvents.status} | execution: ${selectedExecution.executionIndex}/${runEvents.executionCount}`
        : '',
    onBackToBuilder: () => {},
  })

  const onKafkaKeyChange = useCallback((value: KeyValue) => {
    if (state.editingParamsStageIndex === null) return
    dispatchWithEffects({
      type: 'kafkaKeyChanged',
      stageIndex: state.editingParamsStageIndex,
      value,
    })
  }, [state.editingParamsStageIndex])

  // --- Build return value ---

  return {
    isRunsHomeVisible: state.isRunsHomeVisible,
    home: {
      labels: labels.home,
      isLoading: state.isLoading,
      error: state.error ?? runsListError,
      activeRuns: viewData.activeRunCards,
      completedRuns: viewData.completedRunCards,
      onCreateNewRun: onOpenNewRun,
      onOpenRun,
    },
    details: {
      labels: labels.details,
      colorMode,
      isRunFocusedMode: state.isRunFocusedMode,
      error: state.error,
      runError: state.runError,
      statusClassName: viewData.statusClassName,
      statusLabel: viewData.statusLabel,
      runStatus: state.runStatus,
      createRunPanel: {
        labels: labels.create,
        isRabbitConnector: viewData.selectedConnector?.type === 'rabbit',
        destinationLabel: viewData.destinationLabel,
        destinationHint: viewData.destinationHint,
        isLoading: state.isLoading,
        error: state.error,
        runError: state.runError,
        statusClassName: viewData.statusClassName,
        statusLabel: viewData.statusLabel,
        runStatus: state.runStatus,
        workflows: state.workflows,
        workflowName: state.workflowName,
        onWorkflowNameChange: (value) => dispatchWithEffects({ type: 'workflowNameChanged', name: value }),
        connectors: state.connectorState.connectors,
        selectedConnectorName: state.selectedConnectorName,
        onConnectorChange: (value) => dispatchWithEffects({ type: 'connectorSelected', name: value }),
        selectedConnector: viewData.selectedConnector,
        isConnectorActive: viewData.isConnectorActive,
        executionsRaw: state.executionsRaw,
        onExecutionsRawChange: (value) => dispatchWithEffects({ type: 'executionsRawChanged', value }),
        topicRaw: state.topicRaw,
        topicSuggestions: viewData.topicSuggestions,
        onTopicRawChange: (value) => dispatchWithEffects({ type: 'topicRawChanged', value }),
        routingKeyRaw: state.routingKeyRaw,
        onRoutingKeyRawChange: (value) => dispatchWithEffects({ type: 'routingKeyRawChanged', value }),
        exchangeRaw: state.exchangeRaw,
        exchangeSuggestions: viewData.exchangeSuggestions,
        onExchangeRawChange: (value) => dispatchWithEffects({ type: 'exchangeRawChanged', value }),
        rabbitRouteError: viewData.rabbitRouteError,
        canStart: viewData.canStart,
        onStartRun: () => dispatchWithEffects({ type: 'startRun' }),
        onBack: onNavigateToRunsHome,
      },
      workflowPreviewLoading: state.isWorkflowPreviewLoading,
      workflowPreviewError: state.workflowPreviewError,
      workflowGraph,
      onPreviewNodeSelect: (nodeId) => {
        const match = /^preview-params-(\d+)$/.exec(nodeId)
        if (match) {
          dispatchWithEffects({ type: 'editParamsOpened', stageIndex: Number(match[1]) })
        }
      },
      onBack: onOpenRunsHome,
      isParamsModalOpen: state.editingParamsStageIndex !== null,
      paramsModalSubtitle: viewData.paramsModalSubtitle,
      paramsModalMaxWidth: viewData.paramsModalMaxWidth,
      editingHeaderRows: viewData.editingHeaderRows,
      editingKey: viewData.editingKey,
      onKafkaKeyChange: onKafkaKeyChange,
      onCloseParamsModal: () => dispatchWithEffects({ type: 'editParamsClosed' }),
      onSaveParamsModal: () => {
        if (!state.selectedWorkflowDsl) {
          dispatchWithEffects({ type: 'editParamsClosed' })
          return
        }
        dispatchWithEffects({ type: 'saveHeaders' })
      },
      isSavingParamsModal: state.isSavingParamsModal,
      onUpdateHeaderRow: (rowId, field, value) => {
        if (state.editingParamsStageIndex === null) return
        dispatchWithEffects({
          type: 'headerRowUpdated',
          stageIndex: state.editingParamsStageIndex,
          rowId,
          field,
          value,
        })
      },
      onRemoveHeaderRow: (rowId) => {
        if (state.editingParamsStageIndex === null) return
        dispatchWithEffects({
          type: 'headerRowRemoved',
          stageIndex: state.editingParamsStageIndex,
          rowId,
          fallbackRow: { id: createClientId(), key: '', value: '' },
        })
      },
      onAddHeaderRow: () => {
        if (state.editingParamsStageIndex === null) return
        dispatchWithEffects({
          type: 'headerRowAdded',
          stageIndex: state.editingParamsStageIndex,
          newRow: { id: createClientId(), key: '', value: '' },
        })
      },
      runEventsPanel: {
        labels: labels.runEvents,
        runId: state.currentRunId,
        isLoading: runEventsLoading,
        error: runEventsError,
        executionTabs: runEvents
          ? runEvents.executions.map((execution) => ({
              key: `execution-${execution.executionIndex}`,
              executionIndex: execution.executionIndex,
              label: `${labels.runEvents.execution} ${execution.executionIndex}`,
              meta: `${execution.eventCount} ${labels.runEvents.eventsCount}`,
              isActive: selectedExecution?.executionIndex === execution.executionIndex,
            }))
          : [],
        monitoring: runEventsMonitoring,
        onSelectExecution: setSelectedExecutionIndex,
      },
      onStopRun: () => {
        if (!state.currentRunId) {
          runAbortControllerRef.current?.abort()
          return
        }
        dispatchWithEffects({ type: 'stopRun' })
      },
    },
  }
}
