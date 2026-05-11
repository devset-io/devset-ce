/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { createInitialState, reducer } from '../state/KafkaLive.reducer'
import { useKafkaLiveSelectors } from './KafkaLive.selectors'
import { useKafkaLiveEffects } from './KafkaLive.effects'
import type { KafkaLiveAction, KafkaLiveState, KafkaLiveViewData } from '../state/KafkaLive.types'

export type UseKafkaLiveReturn = {
  state: KafkaLiveState
  viewData: KafkaLiveViewData
  dispatch: (action: KafkaLiveAction) => void
}

/** Composes reducer, selectors, and effects for the Kafka Live feature. */
export function useKafkaLive(): UseKafkaLiveReturn {
  const [state, rawDispatch] = useReducer(reducer, undefined, createInitialState)
  const lastActionRef = useRef<KafkaLiveAction | null>(null)

  const viewData = useKafkaLiveSelectors(state)
  useKafkaLiveEffects(state, rawDispatch, lastActionRef)

  const dispatch = useCallback((action: KafkaLiveAction) => {
    lastActionRef.current = action
    rawDispatch(action)
  }, [])

  useEffect(() => {
    dispatch({ type: 'init' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { state, viewData, dispatch }
}
