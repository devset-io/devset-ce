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
import { createInitialState, reducer } from '../state/Settings.reducer'
import { useSettingsSelectors } from './Settings.selectors'
import { useSettingsEffects } from './Settings.effects'
import type { SettingsAction, SettingsEffectLabels, SettingsViewData } from '../state/Settings.types'

/** Composes reducer, selectors, and effects for the settings feature. */
export function useSettings(): { viewData: SettingsViewData; dispatch: (action: SettingsAction) => void } {
  const { t } = useI18n()
  const [state, rawDispatch] = useReducer(reducer, undefined, createInitialState)
  const lastAction = useRef<SettingsAction | null>(null)

  const viewData = useSettingsSelectors(state)

  const labels: SettingsEffectLabels = useMemo(
    () => ({
      savedToast: t('settings.saved.toast'),
      deletedToast: t('settings.deleted.toast'),
      editingWarning: t('settings.editing.reviewWarning'),
      errors: {
        loadConnections: t('settings.error.loadConnections'),
        connect: t('settings.error.connect'),
      },
    }),
    [t],
  )

  useSettingsEffects(state, rawDispatch, lastAction, viewData, labels)

  function dispatch(action: SettingsAction) {
    lastAction.current = action
    rawDispatch(action)
  }

  useEffect(() => {
    dispatch({ type: 'init' })
  }, [])

  return { viewData, dispatch }
}
