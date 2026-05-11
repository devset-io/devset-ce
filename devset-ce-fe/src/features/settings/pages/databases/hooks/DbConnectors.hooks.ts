/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useMemo, useReducer, useRef } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { createDbInitialState, dbConnectorsReducer } from '../state/DbConnectors.reducer'
import { useDbConnectorsEffects } from './DbConnectors.effects'
import type {
  DbConnectorsAction,
  DbConnectorsEffectLabels,
  DbConnectorsViewData,
} from '../state/DbConnectors.types'

/** Composes reducer, selectors, and effects for the db connectors sub-feature. */
export function useDbConnectors(): { viewData: DbConnectorsViewData; dispatch: (action: DbConnectorsAction) => void } {
  const { t } = useI18n()
  const [state, rawDispatch] = useReducer(dbConnectorsReducer, undefined, createDbInitialState)
  const lastAction = useRef<DbConnectorsAction | null>(null)

  const viewData: DbConnectorsViewData = useMemo(() => {
    const normalizedDraftName = state.draft.name.trim()
    const connectorNameExists =
      normalizedDraftName.length > 0 && state.connectors.some((c) => c.name === normalizedDraftName)
    const canSubmit =
      state.draft.type === 'mongodb' &&
      normalizedDraftName.length > 0 &&
      state.draft.connectionString.trim().length > 0 &&
      state.draft.database.trim().length > 0

    return {
      draft: state.draft,
      isSubmitting: state.isSubmitting,
      isRefreshing: state.isRefreshing,
      connectors: state.connectors,
      connectionsError: state.connectionsError,
      editingConnectorName: state.editingConnectorName,
      isOverwriteConfirmOpen: state.isOverwriteConfirmOpen,
      connectorPendingDelete: state.connectorPendingDelete,
      normalizedDraftName,
      connectorNameExists,
      canSubmit,
    }
  }, [state])

  const labels: DbConnectorsEffectLabels = useMemo(
    () => ({
      savedToast: t('dbConnectors.saved.toast'),
      deletedToast: t('dbConnectors.deleted.toast'),
      errors: {
        loadConnections: t('dbConnectors.error.loadConnections'),
        connect: t('dbConnectors.error.connect'),
        delete: t('dbConnectors.error.delete'),
      },
    }),
    [t],
  )

  useDbConnectorsEffects(state, rawDispatch, lastAction, viewData, labels)

  function dispatch(action: DbConnectorsAction) {
    lastAction.current = action
    rawDispatch(action)
  }

  useEffect(() => {
    dispatch({ type: 'init' })
  }, [])

  return { viewData, dispatch }
}
