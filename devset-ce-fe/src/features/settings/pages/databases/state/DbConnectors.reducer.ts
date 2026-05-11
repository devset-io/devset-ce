/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DbConnectorsAction, DbConnectorsState } from './DbConnectors.types'
import { createDefaultDbDraft, getDefaultDbConnectorName } from './DbConnectors.types'

/** Creates the default initial state for db connectors. */
export function createDbInitialState(): DbConnectorsState {
  return {
    draft: createDefaultDbDraft(),
    isSubmitting: false,
    isRefreshing: false,
    connectors: [],
    connectionsError: null,
    editingConnectorName: null,
    isOverwriteConfirmOpen: false,
    connectorPendingDelete: null,
  }
}

/** Pure reducer for db connectors state transitions. */
export function dbConnectorsReducer(state: DbConnectorsState, action: DbConnectorsAction): DbConnectorsState {
  switch (action.type) {
    // Effect-only actions
    case 'init':
    case 'refresh':
    case 'editConnector':
    case 'connect':
    case 'confirmOverwrite':
    case 'confirmDelete':
      return { ...state }
    case 'refreshStart':
      return { ...state, isRefreshing: true, connectionsError: null }
    case 'refreshSuccess':
      return { ...state, isRefreshing: false, connectors: action.connectors }
    case 'refreshFailed':
      return { ...state, isRefreshing: false, connectionsError: action.error }
    case 'draftFieldChanged':
      return { ...state, draft: { ...state.draft, [action.field]: action.value } }
    case 'dbTypeChanged': {
      const previousDefault = getDefaultDbConnectorName(state.draft.type)
      const nextDefault = getDefaultDbConnectorName(action.dbType)
      const trimmedName = state.draft.name.trim()
      const shouldSwap = trimmedName.length === 0 || state.draft.name === previousDefault
      return {
        ...state,
        draft: {
          ...createDefaultDbDraft(action.dbType),
          name: shouldSwap ? nextDefault : state.draft.name,
          username: state.draft.username,
          password: state.draft.password,
        },
      }
    }
    case 'editingLoaded':
      return {
        ...state,
        draft: action.draft,
        editingConnectorName: action.editingName,
        isOverwriteConfirmOpen: false,
        connectorPendingDelete: null,
      }
    case 'startNewConnector':
      return {
        ...state,
        draft: createDefaultDbDraft(state.draft.type),
        editingConnectorName: null,
        isOverwriteConfirmOpen: false,
        connectorPendingDelete: null,
      }
    case 'openOverwriteConfirm':
      return { ...state, isOverwriteConfirmOpen: true }
    case 'closeOverwriteConfirm':
      return { ...state, isOverwriteConfirmOpen: false }
    case 'submitStart':
      return { ...state, isSubmitting: true }
    case 'submitSuccess':
      return {
        ...state,
        isSubmitting: false,
        editingConnectorName: action.connectorName,
        isOverwriteConfirmOpen: false,
        connectorPendingDelete: null,
      }
    case 'submitFailed':
      return { ...state, isSubmitting: false }
    case 'requestDelete':
      return { ...state, connectorPendingDelete: action.connector, isOverwriteConfirmOpen: false }
    case 'requestDeleteEditing': {
      const connector = state.connectors.find((c) => c.name === state.editingConnectorName)
      if (!connector) return state
      return { ...state, connectorPendingDelete: connector, isOverwriteConfirmOpen: false }
    }
    case 'closeDeleteModal':
      return { ...state, connectorPendingDelete: null }
    case 'deleteSuccess': {
      const wasEditing = state.editingConnectorName === action.deletedName
      if (wasEditing) {
        return {
          ...state,
          isSubmitting: false,
          draft: createDefaultDbDraft(action.deletedType),
          editingConnectorName: null,
          isOverwriteConfirmOpen: false,
          connectorPendingDelete: null,
        }
      }
      return { ...state, isSubmitting: false, connectorPendingDelete: null }
    }
    case 'deleteFailed':
      return { ...state, isSubmitting: false }
    default:
      return state
  }
}
