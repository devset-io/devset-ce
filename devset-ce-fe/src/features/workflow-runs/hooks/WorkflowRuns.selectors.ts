/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import { EMPTY_KEY, toRunStatusLabel, toUiRunStatus } from '../workflow-runs.utils'
import type { WorkflowRunsState, WorkflowRunsViewData } from '../state/WorkflowRuns.types'
import type { WorkflowRunCardViewModel, WorkflowRunsHookLabels } from '../types/workflowRuns.view.types'
import type { WorkflowRunStatusResponse } from '../services/workflow-run-execution.service'

function buildRunCards(
  runs: WorkflowRunStatusResponse[],
  labels: WorkflowRunsHookLabels,
  mode: 'active' | 'completed',
): WorkflowRunCardViewModel[] {
  return runs.map((run) => ({
    runId: run.runId,
    workflowLabel: run.workflowName || run.workflowId || labels.homeCard.workflowFallback,
    statusLabel: toRunStatusLabel(toUiRunStatus(run.status), labels.status),
    uiStatus: toUiRunStatus(run.status),
    progressText:
      mode === 'active' ? `${run.completedExecutions}/${run.requestedExecutions}` : undefined,
    resultText:
      mode === 'completed'
        ? run.failedExecutions > 0
          ? labels.homeCard.resultWithErrors
          : labels.homeCard.resultOk
        : undefined,
  }))
}

/** Derives view-ready data from raw workflow runs state. */
export function useWorkflowRunsSelectors(
  state: WorkflowRunsState,
  labels: WorkflowRunsHookLabels,
  activeRuns: WorkflowRunStatusResponse[],
  completedRuns: WorkflowRunStatusResponse[],
): WorkflowRunsViewData {
  return useMemo(() => {
    const selectedConnector =
      state.connectorState.connectors.find((c) => c.name === state.selectedConnectorName) ?? null
    const isKafkaConnector = selectedConnector?.type === 'kafka'
    const isConnectorActive = Boolean(
      selectedConnector && selectedConnector.name === state.connectorState.activeConnectorName,
    )
    const isConnectorReady = Boolean(selectedConnector?.producerConnected)
    const hasRabbitRoutingTarget = Boolean(
      state.topicRaw.trim() || state.routingKeyRaw.trim() || state.exchangeRaw.trim(),
    )
    const rabbitRouteError =
      selectedConnector?.type === 'rabbit' && !hasRabbitRoutingTarget
        ? labels.validation.rabbitRoutingTarget
        : null

    const parsed = Number(state.executionsRaw)
    const executions = !Number.isFinite(parsed) || parsed < 1 ? 1 : Math.floor(parsed)

    const canStart = Boolean(
      selectedConnector &&
        isConnectorReady &&
        state.workflowName &&
        executions >= 1 &&
        (selectedConnector.type !== 'rabbit' || hasRabbitRoutingTarget) &&
        state.runStatus !== 'running' &&
        state.runStatus !== 'stopping',
    )

    const statusLabel = toRunStatusLabel(state.runStatus, labels.status)
    const statusClassName = `runs-status-badge runs-status-${state.runStatus}`

    const editingHeaderRows =
      state.editingParamsStageIndex !== null
        ? (state.headerRowsByStageIndex[state.editingParamsStageIndex] ?? [])
        : []
    const editingKey =
      state.editingParamsStageIndex !== null
        ? (state.keyByStageIndex[state.editingParamsStageIndex] ?? EMPTY_KEY)
        : EMPTY_KEY
    const paramsModalMaxWidth =
      editingHeaderRows.length > 8 ? 760 : editingHeaderRows.length > 4 ? 660 : 560
    const paramsModalSubtitle =
      state.editingParamsStageIndex !== null && state.selectedWorkflowDsl
        ? labels.params.stageLabel.replace(
            '{stage}',
            state.selectedWorkflowDsl.pipeline[state.editingParamsStageIndex]?.stage ?? labels.params.unknownStage,
          )
        : labels.params.editKafkaHeaders

    const topicSuggestions = state.topicSuggestions.map((t) => ({ value: t, label: t }))
    const exchangeSuggestions = state.exchangeSuggestions.map((e) => ({ value: e, label: e }))

    const destinationLabel =
      selectedConnector?.type === 'rabbit' ? labels.create.destinationRabbit : labels.create.destinationKafka
    const destinationHint =
      selectedConnector?.type === 'rabbit' ? labels.create.destinationRabbitHint : labels.create.destinationKafkaHint

    return {
      executions,
      topicSuggestions,
      exchangeSuggestions,
      selectedConnector,
      isKafkaConnector: Boolean(isKafkaConnector),
      isConnectorActive,
      isConnectorReady,
      hasRabbitRoutingTarget,
      rabbitRouteError,
      canStart,
      statusLabel,
      statusClassName,
      editingHeaderRows,
      editingKey,
      paramsModalMaxWidth,
      paramsModalSubtitle,
      destinationLabel,
      destinationHint,
      activeRunCards: buildRunCards(activeRuns, labels, 'active'),
      completedRunCards: buildRunCards(completedRuns, labels, 'completed'),
    }
  }, [state, labels, activeRuns, completedRuns])
}
