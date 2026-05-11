/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useReducer, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { reducer } from '../state/FlowBuilderManage.reducer'
import { useFlowBuilderManageSelectors } from './FlowBuilderManage.selectors'
import { useFlowBuilderManageEffects } from './FlowBuilderManage.effects'
import type { FlowBuilderManageAction, FlowBuilderManageState } from '../state/FlowBuilderManage.types'

function createInitialState(): FlowBuilderManageState {
  return {
    workflows: [],
    isLoading: true,
    loadError: null,
    busyId: null,
    isImportOpen: false,
    importRaw: '',
    importError: null,
  }
}

export function useFlowBuilderManage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [state, rawDispatch] = useReducer(reducer, undefined, createInitialState)

  const lastAction = useRef<FlowBuilderManageAction | null>(null)
  const handledActionRef = useRef<FlowBuilderManageAction | null>(null)

  function dispatchWithEffects(action: FlowBuilderManageAction): void {
    lastAction.current = action
    rawDispatch(action)
  }

  const viewData = useFlowBuilderManageSelectors(state, t)
  useFlowBuilderManageEffects(state, dispatchWithEffects, lastAction, handledActionRef, navigate, viewData.labels)

  return { viewData, dispatch: dispatchWithEffects }
}
