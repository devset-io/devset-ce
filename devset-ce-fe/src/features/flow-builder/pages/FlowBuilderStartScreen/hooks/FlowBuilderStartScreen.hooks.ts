/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useReducer, useRef } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { reducer } from '../state/FlowBuilderStartScreen.reducer'
import { useFlowBuilderStartScreenSelectors } from './FlowBuilderStartScreen.selectors'
import { useFlowBuilderStartScreenEffects } from './FlowBuilderStartScreen.effects'
import type {
  FlowBuilderStartScreenAction,
  FlowBuilderStartScreenCallbacks,
  FlowBuilderStartScreenState,
} from '../state/FlowBuilderStartScreen.types'

function createInitialState(): FlowBuilderStartScreenState {
  return {
    workflows: [],
    isLoadingExisting: true,
    existingError: null,
    isImportOpen: false,
    importRaw: '',
    importError: null,
    openingCatalogFlowId: null,
    catalogOpenError: null,
  }
}

export function useFlowBuilderStartScreen(callbacks: FlowBuilderStartScreenCallbacks) {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const lastAction = useRef<FlowBuilderStartScreenAction | null>(null)
  const handledActionRef = useRef<FlowBuilderStartScreenAction | null>(null)
  const callbacksRef = useRef(callbacks)
  useEffect(() => { callbacksRef.current = callbacks }, [callbacks])

  const viewData = useFlowBuilderStartScreenSelectors(state, t)
  useFlowBuilderStartScreenEffects(state, dispatch, lastAction, handledActionRef, callbacksRef, viewData.labels)

  function dispatchWithEffects(action: FlowBuilderStartScreenAction): void {
    lastAction.current = action
    dispatch(action)
  }

  return { viewData, dispatch: dispatchWithEffects }
}
