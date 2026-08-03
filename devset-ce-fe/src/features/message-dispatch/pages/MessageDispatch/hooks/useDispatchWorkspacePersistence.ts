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
import type { RefObject } from 'react'
import {
  createApiWorkspaceRepository,
  createHybridWorkspaceRepository,
  createLocalStorageWorkspaceRepository,
  type DispatchWorkspaceRepository,
} from '../../../services/dispatchWorkspace.repository'
import { serializeWorkspace } from '../state/MessageDispatch.tabs'
import type { MessageDispatchAction, MessageDispatchState } from '../state/MessageDispatch.types'

const SAVE_DEBOUNCE_MS = 400

/**
 * Persists the open tabs and restores them on mount. Saved-request tabs go to
 * the backend (GET/PUT /dispatch-workspace, cross-device); scratch tabs stay in
 * localStorage. The reducer and components never see the split.
 */
export function useDispatchWorkspacePersistence(
  state: MessageDispatchState,
  dispatch: (action: MessageDispatchAction) => void,
  stateRef: RefObject<MessageDispatchState>,
) {
  // The localStorage repo is read on its own for the fast first hydration; the
  // hybrid repo (localStorage + backend) drives the full merge and every save.
  const localRef = useRef<DispatchWorkspaceRepository | null>(null)
  const repoRef = useRef<DispatchWorkspaceRepository | null>(null)
  if (repoRef.current === null) {
    const local = createLocalStorageWorkspaceRepository()
    localRef.current = local
    repoRef.current = createHybridWorkspaceRepository(local, createApiWorkspaceRepository())
  }

  // Gate saves until the FULL load (localStorage + backend) settles. Otherwise a
  // debounced save fires with only the locally-known tabs and its backend PUT —
  // which carries only saved-ref tabs — would wipe tabs opened on another device
  // before they have been merged in.
  const hydratedRef = useRef(false)

  // Restore the persisted workspace once, on mount, in two phases so a slow
  // backend can't cost in-progress edits.
  useEffect(() => {
    let cancelled = false

    // Phase 1 — localStorage. Resolves within a microtask (before the user can
    // type), so the initial scratch tab is replaced by the stored tabs long
    // before any edit could be lost to a slow, network-backed load.
    void localRef.current
      ?.load()
      .then((local) => {
        if (cancelled || !local || local.tabs.length === 0) return
        dispatch({ type: 'tabsHydrated', tabs: local.tabs, activeTabId: local.activeTabId })
      })
      .catch(() => {
        // Best-effort restore — fall through to the phase-2 merge.
      })

    // Phase 2 — full merge (adds backend-only, cross-device tabs). Append-only
    // in the reducer, so it never clobbers tabs the user is already editing.
    void repoRef.current
      ?.load()
      .then((merged) => {
        if (!cancelled && merged) {
          dispatch({ type: 'serverTabsMerged', tabs: merged.tabs })
        }
        hydratedRef.current = true
      })
      .catch(() => {
        // Best-effort restore — start from the locally-hydrated tabs on failure.
        hydratedRef.current = true
      })

    return () => {
      cancelled = true
    }
  }, [dispatch])

  // Debounced save whenever the state changes — serializeWorkspace stashes the
  // active form so in-progress edits are captured too. The pending save is kept
  // in a ref so it can be flushed on unmount / tab close (see below).
  const pendingSaveRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!hydratedRef.current) return
    pendingSaveRef.current = () => {
      pendingSaveRef.current = null
      void repoRef.current?.save(serializeWorkspace(stateRef.current)).catch(() => {
        // Best-effort persistence — a failed save is retried on the next change.
      })
    }
    const handle = window.setTimeout(() => pendingSaveRef.current?.(), SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [state, stateRef])

  // Flush a still-pending save on unmount and on tab close, so the last edit
  // made inside the debounce window survives (localStorage write is synchronous).
  useEffect(() => {
    const flush = () => pendingSaveRef.current?.()
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [])
}
