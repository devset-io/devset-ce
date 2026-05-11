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
import type { SettingsState, SettingsViewData } from '../state/Settings.types'

/** Derives view-ready data from raw settings state. */
export function useSettingsSelectors(state: SettingsState): SettingsViewData {
  return useMemo(() => {
    const normalizedDraftName = state.draft.name.trim()

    const connectorNameExists =
      normalizedDraftName.length > 0 && state.connectors.some((c) => c.name === normalizedDraftName)

    const canSubmit = computeCanSubmit(state, normalizedDraftName, connectorNameExists)

    const activeConnector =
      state.connectors.find((c) => c.name === state.activeConnectorName) ?? null

    return {
      draft: state.draft,
      isSubmitting: state.isSubmitting,
      isRefreshing: state.isRefreshing,
      connectors: state.connectors,
      activeConnectorName: state.activeConnectorName,
      connectionsError: state.connectionsError,
      editingConnectorName: state.editingConnectorName,
      draftRequiresAttention: state.draftRequiresAttention,
      draftRequiresCredentials: state.draftRequiresCredentials,
      isOverwriteConfirmOpen: state.isOverwriteConfirmOpen,
      connectorPendingDelete: state.connectorPendingDelete,
      normalizedDraftName,
      connectorNameExists,
      canSubmit,
      activeConnector,
    }
  }, [state])
}

function computeCanSubmit(
  state: SettingsState,
  normalizedDraftName: string,
  connectorNameExists: boolean,
): boolean {
  if (!normalizedDraftName) return false

  if (state.draftRequiresCredentials && connectorNameExists) {
    if (!state.draft.username.trim() || !state.draft.password.trim()) return false
  }

  if (state.draft.type === 'kafka') {
    return state.draft.bootstrapServers.trim().length > 0
  }

  const parsedPort = Number(state.draft.port)
  return (
    state.draft.host.trim().length > 0 &&
    state.draft.virtualHost.trim().length > 0 &&
    Number.isFinite(parsedPort) &&
    parsedPort >= 1
  )
}
