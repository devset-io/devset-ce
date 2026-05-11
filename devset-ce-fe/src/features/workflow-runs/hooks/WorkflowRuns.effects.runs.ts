/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { toast } from 'sonner'
import {
  extractSchemaRootFields,
  loadWorkflowById,
  loadWorkflowSchemas,
  updateWorkflow,
} from '../../flow-builder'
import { normalizeError } from '../../../shared/utils/error'
import {
  executeWorkflowDsl,
  getWorkflowRunStatus,
  pollWorkflowRunStatus,
  stopWorkflowRun,
} from '../services/workflow-run-execution.service'
import {
  buildWorkflowWithOverrides,
  mapHeaderRowsFromWorkflow,
  mapKeysFromWorkflow,
  toUiRunStatus,
  RUN_STATUS_POLL_INTERVAL_MS,
} from '../workflow-runs.utils'
import type { MutableRefObject } from 'react'
import type { WorkflowRunsAction, WorkflowRunsState } from '../state/WorkflowRuns.types'
import type { WorkflowRunsHookLabels } from '../types/workflowRuns.view.types'
import type { DslPayload, LoadedSchema } from '../../flow-builder/types'

/** Dependencies for run-specific effect handlers. */
export interface RunEffectDeps {
  labels: WorkflowRunsHookLabels
  onOpenRun: (runId: string) => void
  refreshRuns: () => void
  refreshRunEvents: (runId: string, signal: AbortSignal, full: boolean) => void
  runAbortControllerRef: MutableRefObject<AbortController | null>
}

const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0

function validateRabbitExecutePayload(
  payload: DslPayload,
  expectedProducerName: string,
  schemaById: Map<string, LoadedSchema>,
  labels: WorkflowRunsHookLabels['validation'],
): string | null {
  if (payload.messageType !== 'rabbit') return null
  if (payload.producerName !== expectedProducerName) {
    return labels.rabbitProducerName.replace('{connector}', expectedProducerName)
  }
  if (!hasText(payload.topic) && !hasText(payload.routingKey) && !hasText(payload.exchange)) {
    return labels.rabbitRoutingTarget
  }
  if (payload.contentType !== 'application/x-protobuf') return null

  for (let index = 0; index < payload.pipeline.length; index += 1) {
    const stage = payload.pipeline[index]
    // Query-only stages don't use schemas — skip protobuf validation
    if (stage.query) continue
    const stageName = stage.stage || `pipeline[${index}]`
    const schemaId = typeof stage.schemaId === 'string' ? stage.schemaId.trim() : ''
    if (!schemaId) {
      return labels.missingSchemaId.replace('{stage}', stageName)
    }
    const schema = schemaById.get(schemaId)
    if (!schema) {
      return labels.missingSchemaInRepo.replace('{stage}', stageName).replace('{schemaId}', schemaId)
    }
    if (schema.schemaType !== 'protobuf') {
      return labels.schemaNotProtobuf.replace('{stage}', stageName).replace('{schemaId}', schemaId)
    }
    const allowedRootFields = new Set(extractSchemaRootFields(schema))
    if (allowedRootFields.size === 0) {
      return labels.schemaHasNoFields.replace('{schemaId}', schemaId)
    }
    const setBlock =
      stage.set && typeof stage.set === 'object' && !Array.isArray(stage.set)
        ? (stage.set as Record<string, unknown>) // SAFETY: stage.set confirmed as object by preceding typeof check
        : {}
    const invalidSetFields = Object.keys(setBlock).filter((field) => !allowedRootFields.has(field))
    if (invalidSetFields.length > 0) {
      return labels.invalidSetFields
        .replace('{stage}', stageName)
        .replace('{schemaId}', schemaId)
        .replace('{fields}', invalidSetFields.join(', '))
    }
  }
  return null
}

/** Starts a workflow run with the selected connector and configuration. */
export async function handleStartRun(
  state: WorkflowRunsState,
  dispatch: (action: WorkflowRunsAction) => void,
  deps: RunEffectDeps,
): Promise<void> {
  const selectedConnector =
    state.connectorState.connectors.find((c) => c.name === state.selectedConnectorName)
  if (!selectedConnector) return

  const abortController = new AbortController()
  deps.runAbortControllerRef.current = abortController
  let hasExecuteStarted = false

  try {
    const workflow = state.selectedWorkflowDsl ?? (await loadWorkflowById(state.workflowName))
    const workflowWithOverrides = buildWorkflowWithOverrides(
      workflow,
      state.topicRaw,
      state.headerRowsByStageIndex,
      state.keyByStageIndex,
    )
    const schemas = await loadWorkflowSchemas()
    const schemaById = new Map(schemas.map((schema) => [schema.id, schema]))
    const pipelineWithSchemaIds = workflowWithOverrides.pipeline.map((stage) => {
      // Query-only stages don't use schemas
      if (stage.query) return stage
      const schemaId =
        typeof stage.schemaId === 'string' && stage.schemaId.trim().length > 0
          ? stage.schemaId.trim()
          : (stage.event ?? '').trim()
      const headers = selectedConnector.type === 'kafka' ? stage.headers : {}
      return { ...stage, headers, ...(schemaId ? { schemaId } : {}) }
    })
    const isAnyStageProtobuf = pipelineWithSchemaIds.some(
      (stage) =>
        Boolean(stage.schemaId) &&
        schemaById.get(stage.schemaId as string)?.schemaType === 'protobuf', // SAFETY: schemaId is used as Map key lookup; undefined safely returns undefined from .get()
    )
    const normalizedTopic = state.topicRaw.trim()
    const normalizedRoutingKey = state.routingKeyRaw.trim()
    const normalizedExchange = state.exchangeRaw.trim()
    const topicForPayload =
      selectedConnector.type === 'rabbit'
        ? normalizedTopic || null
        : normalizedTopic || (workflowWithOverrides.topic ?? '')
    const routingKeyForPayload =
      selectedConnector.type === 'rabbit' ? normalizedRoutingKey || null : normalizedRoutingKey
    const exchangeForPayload =
      selectedConnector.type === 'rabbit' ? normalizedExchange || null : normalizedExchange

    const parsed = Number(state.executionsRaw)
    const executions = !Number.isFinite(parsed) || parsed < 1 ? 1 : Math.floor(parsed)

    const payload: DslPayload = {
      ...workflowWithOverrides,
      messageType: selectedConnector.type,
      contentType: isAnyStageProtobuf ? 'application/x-protobuf' : 'application/json',
      producerName: selectedConnector.name,
      topic: topicForPayload,
      routingKey: routingKeyForPayload,
      exchange: exchangeForPayload,
      schemaId: null,
      executions,
      pipeline: pipelineWithSchemaIds,
    }

    const runValidationError = validateRabbitExecutePayload(
      payload,
      selectedConnector.name,
      schemaById,
      deps.labels.validation,
    )
    if (runValidationError) {
      throw new Error(runValidationError)
    }

    toast.info(deps.labels.toast.started)
    hasExecuteStarted = true
    const executeResponse = await executeWorkflowDsl(payload, abortController.signal)
    dispatch({ type: 'runExecuteStarted', runId: executeResponse.runId })
    deps.onOpenRun(executeResponse.runId)
    void deps.refreshRunEvents(executeResponse.runId, new AbortController().signal, false)
    void deps.refreshRuns()

    const finalStatus = await pollWorkflowRunStatus(
      executeResponse.runId,
      abortController.signal,
      (snapshot) => {
        dispatch({ type: 'runStatusUpdated', status: toUiRunStatus(snapshot.status) })
      },
      RUN_STATUS_POLL_INTERVAL_MS,
    )

    const normalizedStatus = finalStatus.status.toUpperCase()
    if (normalizedStatus === 'FAILED' || finalStatus.failedExecutions > 0) {
      dispatch({
        type: 'runFailed',
        error: finalStatus.errorMessage || deps.labels.toast.finishedError,
        wasStarted: true,
      })
      toast.error(finalStatus.errorMessage || deps.labels.toast.finishedError)
    } else if (normalizedStatus === 'STOPPED') {
      dispatch({ type: 'runStopped' })
      toast.warning(deps.labels.toast.stopped)
    } else {
      dispatch({ type: 'runCompleted' })
      toast.success(deps.labels.toast.completed)
    }
  } catch (nextError) {
    if (nextError instanceof DOMException && nextError.name === 'AbortError') {
      dispatch({ type: 'runAborted' })
      toast.warning(deps.labels.toast.stopped)
    } else {
      const errorMessage = normalizeError(nextError, deps.labels.toast.finishedError)
      dispatch({ type: 'runFailed', error: errorMessage, wasStarted: hasExecuteStarted })
      toast.error(errorMessage)
    }
  } finally {
    deps.runAbortControllerRef.current = null
    void deps.refreshRuns()
  }
}

/** Sends a stop request for the currently active run. */
export async function handleStopRun(
  state: WorkflowRunsState,
  dispatch: (action: WorkflowRunsAction) => void,
  deps: RunEffectDeps,
): Promise<void> {
  if (!state.currentRunId) {
    deps.runAbortControllerRef.current?.abort()
    return
  }

  try {
    const signal = deps.runAbortControllerRef.current?.signal ?? new AbortController().signal
    const stopSnapshot = await stopWorkflowRun(state.currentRunId, signal)
    dispatch({ type: 'stopRunSuccess', status: toUiRunStatus(stopSnapshot.status) })
    if (stopSnapshot.status.toUpperCase() === 'STOPPED') {
      toast.warning(deps.labels.toast.stopped)
    } else {
      toast.info(deps.labels.toast.stopRequested)
    }
    void deps.refreshRuns()
    void deps.refreshRunEvents(state.currentRunId, new AbortController().signal, false)
    const refreshedSnapshot = await getWorkflowRunStatus(state.currentRunId, new AbortController().signal)
    dispatch({ type: 'stopRunRefreshed', status: toUiRunStatus(refreshedSnapshot.status) })
  } catch (nextError) {
    const message = normalizeError(nextError, deps.labels.errors.stopRun)
    dispatch({ type: 'stopRunFailed', error: message })
    toast.error(message)
  }
}

/** Persists custom header overrides for the current run configuration. */
export async function handleSaveHeaders(
  state: WorkflowRunsState,
  dispatch: (action: WorkflowRunsAction) => void,
  labels: WorkflowRunsHookLabels,
): Promise<void> {
  if (!state.selectedWorkflowDsl) {
    dispatch({ type: 'editParamsClosed' })
    dispatch({ type: 'saveHeadersFailed' })
    return
  }

  try {
    const workflowWithOverrides = buildWorkflowWithOverrides(
      state.selectedWorkflowDsl,
      state.topicRaw,
      state.headerRowsByStageIndex,
      state.keyByStageIndex,
    )
    const saved = await updateWorkflow(workflowWithOverrides.id, workflowWithOverrides)
    dispatch({
      type: 'saveHeadersSuccess',
      dsl: saved,
      headerRows: mapHeaderRowsFromWorkflow(saved),
      keys: mapKeysFromWorkflow(saved),
    })
    toast.success(labels.params.saved)
  } catch (nextError) {
    dispatch({ type: 'saveHeadersFailed' })
    toast.error(normalizeError(nextError, labels.params.saveFailed))
  }
}
