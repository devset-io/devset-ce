/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import type { SingleRequestPayload } from '../../../services/message-dispatch.service'
import type { MessageDispatchAction, MessageDispatchState } from '../state/MessageDispatch.types'

/**
 * Hydrates a saved-request tab that has no local snapshot yet (opened fresh or
 * restored from the backend, which stores pointers only). When such a tab is
 * active and its request is in the catalog, its form is populated from the saved
 * request. A per-tab guard prevents re-hydrating over the user's later edits.
 */
export function useDispatchTabHydration(
  state: MessageDispatchState,
  dispatch: Dispatch<MessageDispatchAction>,
  loadSingleRequestToDispatch: (entry: SingleRequestPayload, options?: { silent?: boolean }) => void,
) {
  const hydratedTabIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId)
    if (!activeTab || !activeTab.savedRequestRef || activeTab.formSnapshot !== null) return
    if (hydratedTabIds.current.has(activeTab.id)) return

    const ref = activeTab.savedRequestRef
    const entry = state.singleRequests.find(
      (request) =>
        request.singleRequestName === ref.singleRequestName &&
        request.collectionName === ref.collectionName,
    )
    if (!entry) return

    hydratedTabIds.current.add(activeTab.id)
    loadSingleRequestToDispatch(entry, { silent: true })
    dispatch({ type: 'collectionSelected', name: entry.collectionName })
    dispatch({ type: 'singleRequestSelected', name: entry.singleRequestName, collectionName: entry.collectionName })
    dispatch({ type: 'singleRequestNameChanged', value: entry.singleRequestName })
  }, [state.tabs, state.activeTabId, state.singleRequests, dispatch, loadSingleRequestToDispatch])
}
