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
  createConnectorConfiguration,
  deleteConnectorConfiguration,
  getEditableConnectorConfiguration,
  loadConnectorsState,
  setActiveConnector,
  subscribeConnectorsChanges,
  type ConnectorStatus,
} from '../../../../../shared/services/kafka-connectors.service'
import { normalizeError } from '../../../../../shared/utils/error'
import { toConnectorDraft, toConnectorRequest } from '../state/Settings.types'
import type {
  SettingsAction,
  SettingsEffectLabels,
  SettingsState,
  SettingsViewData,
} from '../state/Settings.types'

/** Dispatches side effects in response to settings actions. */
export function useSettingsEffects(
  state: SettingsState,
  dispatch: (action: SettingsAction) => void,
  lastActionRef: MutableRefObject<SettingsAction | null>,
  viewData: SettingsViewData,
  labels: SettingsEffectLabels,
): void {
  // Action-driven effect — runs after every render, processes lastAction
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
        handleEditConnector(action.connector, dispatch, labels)
        break
      case 'connect':
        if (viewData.connectorNameExists) {
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
      case 'activateConnector':
        setActiveConnector(action.name)
        break
    }
  })

  // Connector state subscription
  useEffect(() => {
    return subscribeConnectorsChanges((change) => {
      if (change.type === 'active_connector_changed') {
        dispatch({ type: 'activeConnectorChanged', activeConnectorName: change.activeConnectorName })
        return
      }
      void handleRefresh(dispatch, labels)
    })
  }, [dispatch, labels])
}

/** Reloads the connector list from the API. */
async function handleRefresh(
  dispatch: (action: SettingsAction) => void,
  labels: SettingsEffectLabels,
): Promise<void> {
  dispatch({ type: 'refreshStart' })
  try {
    const result = await loadConnectorsState()
    dispatch({
      type: 'refreshSuccess',
      connectors: result.connectors,
      activeConnectorName: result.activeConnectorName,
    })
  } catch (error) {
    dispatch({
      type: 'refreshFailed',
      error: normalizeError(error, labels.errors.loadConnections),
    })
  }
}

/** Loads a connector's current config into the edit form. */
function handleEditConnector(
  connector: ConnectorStatus,
  dispatch: (action: SettingsAction) => void,
  labels: SettingsEffectLabels,
): void {
  const editable = getEditableConnectorConfiguration(connector)
  dispatch({
    type: 'editingLoaded',
    draft: toConnectorDraft(editable.configuration),
    editingName: connector.name,
    requiresAttention: editable.requiresAttention,
    requiresCredentials: editable.requiresCredentials,
  })
  if (editable.requiresAttention) {
    toast.warning(labels.editingWarning)
  }
}

/** Creates or updates a connector via the API. */
async function handleSubmit(
  state: SettingsState,
  dispatch: (action: SettingsAction) => void,
  labels: SettingsEffectLabels,
): Promise<void> {
  const request = toConnectorRequest(state.draft)
  const connectorName = request.name.trim()
  dispatch({ type: 'submitStart' })
  try {
    await createConnectorConfiguration(request)
    dispatch({
      type: 'submitSuccess',
      draft: toConnectorDraft(request),
      connectorName,
    })
    toast.success(labels.savedToast.replace('{name}', connectorName))
  } catch (error) {
    dispatch({ type: 'submitFailed' })
    toast.error(normalizeError(error, labels.errors.connect))
  }
}

/** Deletes a connector and refreshes the list. */
async function handleDelete(
  state: SettingsState,
  dispatch: (action: SettingsAction) => void,
  labels: SettingsEffectLabels,
): Promise<void> {
  const pending = state.connectorPendingDelete
  if (!pending) return

  dispatch({ type: 'submitStart' })
  try {
    await deleteConnectorConfiguration(pending.type, pending.name)
    dispatch({
      type: 'deleteSuccess',
      deletedName: pending.name,
      deletedType: pending.type,
      wasEditing: state.editingConnectorName === pending.name,
    })
    toast.success(labels.deletedToast.replace('{name}', pending.name))
  } catch (error) {
    dispatch({ type: 'deleteFailed' })
    toast.error(normalizeError(error, labels.errors.connect))
  }
}
