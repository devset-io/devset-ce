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
import {
  createBootstrapFromPayload,
  parseDslPayloadFromJson,
} from '../../../services/workflow-bootstrap.service'
import {
  loadExistingWorkflows,
  loadWorkflowById,
} from '../../../services/workflow-library.service'
import { normalizeError } from '../../../../../shared/utils/error'
import type {
  FlowBuilderStartScreenAction,
  FlowBuilderStartScreenCallbacks,
  FlowBuilderStartScreenLabels,
  FlowBuilderStartScreenState,
} from '../state/FlowBuilderStartScreen.types'

export function useFlowBuilderStartScreenEffects(
  state: FlowBuilderStartScreenState,
  dispatch: (action: FlowBuilderStartScreenAction) => void,
  lastAction: RefObject<FlowBuilderStartScreenAction | null>,
  handledActionRef: RefObject<FlowBuilderStartScreenAction | null>,
  callbacksRef: RefObject<FlowBuilderStartScreenCallbacks>,
  labels: FlowBuilderStartScreenLabels,
): void {
  const loadCatalog = async (): Promise<void> => {
    try {
      const workflows = await loadExistingWorkflows()
      dispatch({ type: 'loadExistingSuccess', workflows })
    } catch (error) {
      dispatch({
        type: 'loadExistingFailed',
        error: normalizeError(error, labels.loadExistingError),
      })
    }
  }

  const applyImport = (): void => {
    try {
      const payload = parseDslPayloadFromJson(state.importRaw)
      callbacksRef.current.onStart(createBootstrapFromPayload(payload, { isPersisted: false }))
    } catch (error) {
      dispatch({
        type: 'applyImportFailed',
        error: normalizeError(error, labels.invalidJsonError),
      })
    }
  }

  const openSavedWorkflow = async (workflowId: string): Promise<void> => {
    try {
      const payload = await loadWorkflowById(workflowId)
      callbacksRef.current.onStart(createBootstrapFromPayload(payload, { isPersisted: true }))
    } catch (error) {
      dispatch({
        type: 'openSavedWorkflowFailed',
        error: normalizeError(error, labels.openSelectedError),
      })
    }
  }

  useEffect(() => {
    const action = lastAction.current
    if (!action || action === handledActionRef.current) return
    handledActionRef.current = action

    switch (action.type) {
      case 'init':
        void loadCatalog()
        return
      case 'createNew':
        callbacksRef.current.onCreateNew()
        return
      case 'applyImport':
        applyImport()
        return
      case 'openSavedWorkflow':
        void openSavedWorkflow(action.workflowId)
        return
      default:
        return
    }
  })
}
