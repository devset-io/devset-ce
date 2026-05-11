/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createBootstrapFromPayload,
  createEmptyBootstrap,
  parseDslPayloadFromJson,
} from '../../../services/workflow-bootstrap.service'
import {
  deleteWorkflow,
  loadExistingWorkflows,
  loadWorkflowById,
} from '../../../services/workflow-library.service'
import { normalizeError } from '../../../../../shared/utils/error'
import type { FlowBuilderManageAction, FlowBuilderManageLabels, FlowBuilderManageState } from '../state/FlowBuilderManage.types'

const FLOW_BUILDER_EDITOR_ROUTE = '/flow-builder/editor'

export function buildCloneWorkflowId(workflowId: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const suffix = Array.from(
    { length: 3 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')
  return `${workflowId}-clone-${suffix}`
}

export function useFlowBuilderManageEffects(
  state: FlowBuilderManageState,
  dispatch: (action: FlowBuilderManageAction) => void,
  lastAction: RefObject<FlowBuilderManageAction | null>,
  handledActionRef: RefObject<FlowBuilderManageAction | null>,
  navigate: ReturnType<typeof useNavigate>,
  labels: FlowBuilderManageLabels,
): void {
  const loadWorkflows = async (signal: AbortSignal): Promise<void> => {
    try {
      const workflows = await loadExistingWorkflows(signal)
      dispatch({ type: 'loadSuccess', workflows })
    } catch (error) {
      if (signal.aborted) return
      dispatch({ type: 'loadFailed', error: normalizeError(error, labels.loadError) })
    }
  }

  const applyImport = (): void => {
    try {
      const payload = parseDslPayloadFromJson(state.importRaw)
      navigate(FLOW_BUILDER_EDITOR_ROUTE, {
        state: { bootstrap: createBootstrapFromPayload(payload, { isPersisted: false }) },
      })
    } catch (error) {
      dispatch({
        type: 'applyImportFailed',
        error: normalizeError(error, labels.invalidJsonError),
      })
    }
  }

  const openWorkflowAction = async (workflowId: string): Promise<void> => {
    try {
      const payload = await loadWorkflowById(workflowId)
      navigate(FLOW_BUILDER_EDITOR_ROUTE, {
        state: { bootstrap: createBootstrapFromPayload(payload, { isPersisted: true }) },
      })
    } catch (error) {
      toast.error(normalizeError(error, labels.openError))
      dispatch({ type: 'workflowActionFinished' })
    }
  }

  const cloneWorkflowAction = async (workflowId: string): Promise<void> => {
    try {
      const payload = await loadWorkflowById(workflowId)
      navigate(FLOW_BUILDER_EDITOR_ROUTE, {
        state: {
          bootstrap: createBootstrapFromPayload(
            { ...payload, id: buildCloneWorkflowId(payload.id) },
            { isPersisted: false },
          ),
        },
      })
    } catch (error) {
      toast.error(normalizeError(error, labels.cloneError))
      dispatch({ type: 'workflowActionFinished' })
    }
  }

  const deleteWorkflowAction = async (workflowId: string): Promise<void> => {
    try {
      await deleteWorkflow(workflowId)
      toast.success(labels.deleted(workflowId))
      dispatch({ type: 'deleteWorkflowSucceeded' })
    } catch (error) {
      toast.error(normalizeError(error, labels.deleteError))
      dispatch({ type: 'workflowActionFinished' })
    }
  }

  useEffect(() => {
    const action = lastAction.current
    if (!action || action === handledActionRef.current) return
    handledActionRef.current = action

    switch (action.type) {
      case 'init':
      case 'deleteWorkflowSucceeded': {
        const controller = new AbortController()
        void loadWorkflows(controller.signal)
        return () => controller.abort()
      }
      case 'createNew':
        navigate(FLOW_BUILDER_EDITOR_ROUTE, {
          state: { bootstrap: createEmptyBootstrap() },
        })
        return
      case 'applyImport':
        applyImport()
        return
      case 'openWorkflow':
        void openWorkflowAction(action.workflowId)
        return
      case 'cloneWorkflow':
        void cloneWorkflowAction(action.workflowId)
        return
      case 'deleteWorkflow':
        void deleteWorkflowAction(action.workflowId)
        return
      default:
        return
    }
  })
}
