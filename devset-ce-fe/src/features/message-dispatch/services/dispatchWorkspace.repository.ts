/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// Dispatch workspace repository
//
// Tabs are split by kind:
//   - saved-request tabs (with a savedRequestRef) → the backend
//     (GET/PUT /dispatch-workspace), pointers only, cross-device.
//   - scratch tabs (no ref) → localStorage, this device only.
//
// The hybrid repository composes both and re-merges on load. The reducer and
// components see a single DispatchWorkspaceRepository and never learn the split.
// ──────────────────────────────────────────────────────────────

import { fetchApi } from '../../../shared/services/http-api.service'
import { msg } from '../../../shared/utils/i18n'
import { safeJsonParse } from '../../../shared/utils/safeJsonParse'
import type { DispatchTab, PersistedWorkspace } from '../pages/MessageDispatch/state/MessageDispatch.tabs'

/** Reads and writes the persisted message-dispatch workspace. */
export interface DispatchWorkspaceRepository {
  /** Returns the stored workspace, or {@code null} when nothing is persisted. */
  load(): Promise<PersistedWorkspace | null>
  /** Persists the given workspace, replacing any previous one. */
  save(workspace: PersistedWorkspace): Promise<void>
}

// ── localStorage repository (scratch tabs) ──

const STORAGE_KEY = 'devset.messageDispatch.workspace'

/**
 * Schema version of the localStorage payload, bumped whenever the stored shape
 * (DispatchTab/PerTabFields) changes incompatibly. Cheap to add now, while there
 * is nothing yet to migrate from; a mismatch is treated like any other corrupt
 * payload below rather than risking a stale shape flowing back into the reducer.
 */
const WORKSPACE_SCHEMA_VERSION = 1

/** localStorage's on-disk shape: the persisted workspace plus its schema version. */
type StoredWorkspace = PersistedWorkspace & { schemaVersion: number }

/** The subset of the Storage API the repository needs. */
type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * localStorage-backed repository. Storage is injectable so it is testable
 * without a DOM. All access is guarded — a throwing/full/unavailable storage
 * degrades to "no persisted workspace".
 */
export function createLocalStorageWorkspaceRepository(
  storage: WorkspaceStorage = window.localStorage,
): DispatchWorkspaceRepository {
  return {
    load() {
      let raw: string | null
      try {
        raw = storage.getItem(STORAGE_KEY)
      } catch {
        return Promise.resolve(null)
      }
      if (!raw) return Promise.resolve(null)
      const parsed = safeJsonParse<StoredWorkspace | null>(raw, null)
      if (!parsed || !Array.isArray(parsed.tabs) || parsed.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
        return Promise.resolve(null)
      }
      const { schemaVersion: _schemaVersion, ...workspace } = parsed
      return Promise.resolve(workspace)
    },

    save(workspace) {
      try {
        const stored: StoredWorkspace = { ...workspace, schemaVersion: WORKSPACE_SCHEMA_VERSION }
        storage.setItem(STORAGE_KEY, JSON.stringify(stored))
      } catch (error) {
        // Storage unavailable or full (~5 MB quota). We can't persist — the whole
        // workspace silently stops surviving reloads, so at least surface it.
        console.warn('Failed to persist message-dispatch workspace to localStorage', error)
      }
      return Promise.resolve()
    },
  }
}

// ── API repository (saved-request tabs) ──

type ApiWorkspaceTab = {
  id: string
  collectionName: string
  singleRequestName: string
  activeHistoryId: string | null
  // The domain normalizes a blank title to null, so the wire value is nullable
  // even though a DispatchTab always carries a non-blank title.
  title: string | null
  order: number
}

type ApiWorkspace = {
  activeTabId: string | null
  tabs: ApiWorkspaceTab[]
}

const toDispatchTab = (tab: ApiWorkspaceTab): DispatchTab => ({
  id: tab.id,
  savedRequestRef: { collectionName: tab.collectionName, singleRequestName: tab.singleRequestName },
  formSnapshot: null,
  activeHistoryRef: tab.activeHistoryId ?? null,
  title: tab.title ?? tab.singleRequestName,
  order: tab.order,
})

const toApiTab = (tab: DispatchTab, ref: NonNullable<DispatchTab['savedRequestRef']>): ApiWorkspaceTab => ({
  id: tab.id,
  collectionName: ref.collectionName,
  singleRequestName: ref.singleRequestName,
  activeHistoryId: tab.activeHistoryRef,
  title: tab.title,
  order: tab.order,
})

/** Backend-backed repository hitting GET/PUT /dispatch-workspace (pointers only). */
export function createApiWorkspaceRepository(): DispatchWorkspaceRepository {
  return {
    async load() {
      const response = await fetchApi('/dispatch-workspace', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        errorLabel: msg('Wczytanie zakladek nie powiodlo sie', 'load workspace failed'),
      })
      const raw = (await response.json().catch(() => null)) as ApiWorkspace | null
      if (!raw || !Array.isArray(raw.tabs)) return null
      return {
        activeTabId: raw.activeTabId ?? null,
        tabs: raw.tabs.map(toDispatchTab),
      }
    },

    async save(workspace) {
      const body: ApiWorkspace = {
        activeTabId: workspace.activeTabId,
        tabs: workspace.tabs.flatMap((tab) =>
          tab.savedRequestRef ? [toApiTab(tab, tab.savedRequestRef)] : [],
        ),
      }
      await fetchApi('/dispatch-workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        errorLabel: msg('Zapis zakladek nie powiodl sie', 'save workspace failed'),
      })
    },
  }
}

// ── Hybrid repository (saved → backend, scratch → localStorage) ──

/**
 * localStorage keeps the full working state of EVERY tab (scratch drafts and the
 * edited mirrors of saved requests), so in-progress edits survive a reload. The
 * backend additionally receives the pointers of saved-request tabs so the open
 * set can be restored on another device.
 *
 * On load, local content wins per tab id (preserving edits); tabs that only the
 * backend knows about (opened on another device) are added and later hydrated
 * fresh from their saved request.
 */
export function createHybridWorkspaceRepository(
  local: DispatchWorkspaceRepository,
  api: DispatchWorkspaceRepository,
): DispatchWorkspaceRepository {
  return {
    async load() {
      const [localWorkspace, serverWorkspace] = await Promise.all([
        local.load(),
        api.load().catch(() => null),
      ])
      const localTabs = localWorkspace?.tabs ?? []
      const localIds = new Set(localTabs.map((tab) => tab.id))
      const serverOnly = (serverWorkspace?.tabs ?? []).filter((tab) => !localIds.has(tab.id))
      if (localTabs.length === 0 && serverOnly.length === 0) return null
      const tabs = [...localTabs, ...serverOnly]
        .sort((a, b) => a.order - b.order)
        .map((tab, index) => ({ ...tab, order: index }))
      return {
        activeTabId: localWorkspace?.activeTabId ?? serverWorkspace?.activeTabId ?? null,
        tabs,
      }
    },

    async save(workspace) {
      const saved = workspace.tabs.filter((tab) => tab.savedRequestRef !== null)
      await Promise.all([
        // Full content of every tab — this is what preserves in-progress edits.
        local.save(workspace),
        // Pointers of saved-request tabs — the cross-device open set.
        api.save({ activeTabId: workspace.activeTabId, tabs: saved }),
      ])
    },
  }
}
