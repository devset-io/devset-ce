/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { SettingsAction, SettingsState } from './Settings.types'
import { createDefaultDraft, getDefaultConnectorName } from './Settings.types'

/** Creates the default initial state for settings. */
export function createInitialState(): SettingsState {
  return {
    draft: createDefaultDraft(),
    isSubmitting: false,
    isRefreshing: false,
    connectors: [],
    activeConnectorName: null,
    connectionsError: null,
    editingConnectorName: null,
    draftRequiresAttention: false,
    draftRequiresCredentials: false,
    isOverwriteConfirmOpen: false,
    connectorPendingDelete: null,
  }
}

/** Pure reducer for settings state transitions. */
export function reducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    // Effect-only actions — spread creates a new reference so React re-renders and the effect fires
    case 'init':
    case 'refresh':
    case 'editConnector':
    case 'connect':
    case 'confirmOverwrite':
    case 'confirmDelete':
    case 'activateConnector':
      return { ...state }
    case 'refreshStart':
      return { ...state, isRefreshing: true, connectionsError: null }
    case 'refreshSuccess':
      return {
        ...state,
        isRefreshing: false,
        connectors: action.connectors,
        activeConnectorName: action.activeConnectorName,
      }
    case 'refreshFailed':
      return { ...state, isRefreshing: false, connectionsError: action.error }
    case 'activeConnectorChanged':
      return { ...state, activeConnectorName: action.activeConnectorName }
    case 'draftFieldChanged':
      return { ...state, draft: { ...state.draft, [action.field]: action.value } }
    case 'connectorTypeChanged': {
      const previousDefaultName = getDefaultConnectorName(state.draft.type)
      const nextDefaultName = getDefaultConnectorName(action.connectorType)
      const trimmedName = state.draft.name.trim()
      const shouldSwapDefaultName =
        trimmedName.length === 0 || state.draft.name === previousDefaultName || state.draft.name === 'local'
      return {
        ...state,
        draft: {
          ...state.draft,
          type: action.connectorType,
          name: shouldSwapDefaultName ? nextDefaultName : state.draft.name,
        },
      }
    }
    case 'startNewConnector':
      return {
        ...state,
        draft: createDefaultDraft(state.draft.type),
        editingConnectorName: null,
        draftRequiresAttention: false,
        draftRequiresCredentials: false,
        isOverwriteConfirmOpen: false,
        connectorPendingDelete: null,
      }
    case 'editingLoaded':
      return {
        ...state,
        draft: action.draft,
        editingConnectorName: action.editingName,
        draftRequiresAttention: action.requiresAttention,
        draftRequiresCredentials: action.requiresCredentials,
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
        draft: action.draft,
        editingConnectorName: action.connectorName,
        draftRequiresAttention: false,
        draftRequiresCredentials: false,
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
    case 'deleteSuccess':
      if (action.wasEditing) {
        return {
          ...state,
          isSubmitting: false,
          draft: createDefaultDraft(action.deletedType),
          editingConnectorName: null,
          draftRequiresAttention: false,
          draftRequiresCredentials: false,
          isOverwriteConfirmOpen: false,
          connectorPendingDelete: null,
        }
      }
      return { ...state, isSubmitting: false, connectorPendingDelete: null }
    case 'deleteFailed':
      return { ...state, isSubmitting: false }
    default:
      return state
  }
}
