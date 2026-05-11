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
import type { MutableRefObject } from 'react'
import { toast } from 'sonner'
import {
  listDbConnectorConfigurations,
  createDbConnectorConfiguration,
  deleteDbConnectorConfiguration,
} from '../../../../../shared/services/db-connectors.service'
import { normalizeError } from '../../../../../shared/utils/error'
import {
  toDbConnectorDraft,
  type DbConnectorsAction,
  type DbConnectorsEffectLabels,
  type DbConnectorsState,
  type DbConnectorsViewData,
} from '../state/DbConnectors.types'

/** Dispatches side effects in response to db connector actions. */
export function useDbConnectorsEffects(
  state: DbConnectorsState,
  dispatch: (action: DbConnectorsAction) => void,
  lastActionRef: MutableRefObject<DbConnectorsAction | null>,
  viewData: DbConnectorsViewData,
  labels: DbConnectorsEffectLabels,
): void {
  useEffect(() => {
    const action = lastActionRef.current
    lastActionRef.current = null
    if (!action) return

    switch (action.type) {
      case 'init':
      case 'refresh':
        void handleRefresh(dispatch, labels)
        break
      case 'editConnector':
        dispatch({
          type: 'editingLoaded',
          draft: toDbConnectorDraft(action.connector),
          editingName: action.connector.name,
        })
        break
      case 'connect':
        if (viewData.connectorNameExists && state.editingConnectorName !== viewData.normalizedDraftName) {
          dispatch({ type: 'openOverwriteConfirm' })
        } else {
          void handleSubmit(state, dispatch, labels)
        }
        break
      case 'confirmOverwrite':
        void handleSubmit(state, dispatch, labels)
        break
      case 'confirmDelete':
        void handleDelete(state, dispatch, labels)
        break
    }
  })
}

async function handleRefresh(
  dispatch: (action: DbConnectorsAction) => void,
  labels: DbConnectorsEffectLabels,
): Promise<void> {
  dispatch({ type: 'refreshStart' })
  try {
    const connectors = await listDbConnectorConfigurations()
    dispatch({ type: 'refreshSuccess', connectors })
  } catch (error) {
    dispatch({ type: 'refreshFailed', error: normalizeError(error, labels.errors.loadConnections) })
  }
}

async function handleSubmit(
  state: DbConnectorsState,
  dispatch: (action: DbConnectorsAction) => void,
  labels: DbConnectorsEffectLabels,
): Promise<void> {
  const draft = state.draft
  const connectorName = draft.name.trim()
  dispatch({ type: 'submitStart' })
  try {
    await createDbConnectorConfiguration({
      type: draft.type,
      name: connectorName,
      connectionString: draft.connectionString.trim(),
      database: draft.database.trim(),
      username: draft.username.trim() || null,
      password: draft.password.trim() || null,
    })
    dispatch({ type: 'submitSuccess', connectorName })
    toast.success(labels.savedToast.replace('{name}', connectorName))
    void handleRefresh(dispatch, labels)
  } catch (error) {
    dispatch({ type: 'submitFailed' })
    toast.error(normalizeError(error, labels.errors.connect))
  }
}

async function handleDelete(
  state: DbConnectorsState,
  dispatch: (action: DbConnectorsAction) => void,
  labels: DbConnectorsEffectLabels,
): Promise<void> {
  const pending = state.connectorPendingDelete
  if (!pending) return

  dispatch({ type: 'submitStart' })
  try {
    await deleteDbConnectorConfiguration(pending.type, pending.name)
    dispatch({
      type: 'deleteSuccess',
      deletedName: pending.name,
      deletedType: pending.type,
    })
    toast.success(labels.deletedToast.replace('{name}', pending.name))
    void handleRefresh(dispatch, labels)
  } catch (error) {
    dispatch({ type: 'deleteFailed' })
    toast.error(normalizeError(error, labels.errors.delete))
  }
}
