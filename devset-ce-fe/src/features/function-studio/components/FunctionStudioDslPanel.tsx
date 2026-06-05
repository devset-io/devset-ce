/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { DslStage } from '../../flow-builder/types.ts'
import { JsonCodeEditor } from '../../flow-builder/components/JsonCodeEditor.tsx'
import { buildTabButtonClass, FB_STUDIO, FB_UI } from '../../flow-builder/ui/ui-classes.ts'

type FunctionStudioDslPanelProps = {
  selectedStageDsl: DslStage | null
  hasPendingChanges: boolean
  // Fingerprint of the dispatched dsl-raw op (length proxy). Surfaced as a
  // data attribute on the badge so e2e tests can wait for the debounce to
  // actually flush instead of relying on a wall-clock waitForTimeout.
  pendingDslRawFingerprint: number
  // Snapshot of the currently-queued dsl-raw op, read ONLY at mount. Restores
  // the typed draft after a mode-toggle remount; updates to it during the
  // panel's lifetime are intentionally ignored to avoid clobbering active edits.
  pendingDslRawSnapshot: { setRaw: string; stateRaw: string } | null
  onDslRawChanged: (setRaw: string, stateRaw: string) => void
  onDslRawCleared: () => void
  onDslRawErrorChanged: (hasError: boolean) => void
}

// Debounce window for piping editor drafts up to the reducer. Short enough
// that the top Save button reflects intent quickly, long enough to avoid
// thrashing pendingOps on every keystroke.
const DSL_DISPATCH_DEBOUNCE_MS = 400

export const FunctionStudioDslPanel = React.memo(function FunctionStudioDslPanel({
  selectedStageDsl,
  hasPendingChanges,
  pendingDslRawFingerprint,
  pendingDslRawSnapshot,
  onDslRawChanged,
  onDslRawCleared,
  onDslRawErrorChanged,
}: FunctionStudioDslPanelProps) {
  const { t } = useI18n()
  const [activeRootTab, setActiveRootTab] = useState<'set' | 'state'>('set')
  const sourceSetRaw = JSON.stringify(selectedStageDsl?.set ?? {}, null, 2)
  const sourceStateRaw = JSON.stringify(selectedStageDsl?.state ?? {}, null, 2)
  // Lazy initializer reads pendingDslRawSnapshot once. After mount, snapshot
  // updates from upstream are intentionally NOT mirrored back into draft state —
  // doing so would clobber edits in progress (the op in flight is, by definition,
  // the value the panel just dispatched).
  const [rawDraftState, setRawDraftState] = useState<{
    sourceSetRaw: string
    draftSetRaw: string
    setError: string | null
    sourceStateRaw: string
    draftStateRaw: string
    stateError: string | null
  }>(() => ({
    sourceSetRaw,
    draftSetRaw: pendingDslRawSnapshot?.setRaw ?? sourceSetRaw,
    setError: null,
    sourceStateRaw,
    draftStateRaw: pendingDslRawSnapshot?.stateRaw ?? sourceStateRaw,
    stateError: null,
  }))
  const draftSetRaw = rawDraftState.sourceSetRaw === sourceSetRaw ? rawDraftState.draftSetRaw : sourceSetRaw
  const draftStateRaw =
    rawDraftState.sourceStateRaw === sourceStateRaw ? rawDraftState.draftStateRaw : sourceStateRaw
  const setError = rawDraftState.sourceSetRaw === sourceSetRaw ? rawDraftState.setError : null
  const stateError = rawDraftState.sourceStateRaw === sourceStateRaw ? rawDraftState.stateError : null
  const hasLocalChanges = draftSetRaw !== sourceSetRaw || draftStateRaw !== sourceStateRaw
  const activeDraftRaw = activeRootTab === 'set' ? draftSetRaw : draftStateRaw
  const activeRootError = activeRootTab === 'set' ? setError : stateError

  const setDraftSetRaw = (nextRaw: string) => {
    setRawDraftState({
      sourceSetRaw,
      draftSetRaw: nextRaw,
      setError: null,
      sourceStateRaw,
      draftStateRaw,
      stateError,
    })
  }

  const setDraftStateRaw = (nextRaw: string) => {
    setRawDraftState({
      sourceSetRaw,
      draftSetRaw,
      setError,
      sourceStateRaw,
      draftStateRaw: nextRaw,
      stateError: null,
    })
  }

  const handleBeautify = () => {
    let nextSetRaw = draftSetRaw
    let nextStateRaw = draftStateRaw
    let nextSetError: string | null = null
    let nextStateError: string | null = null

    try {
      nextSetRaw = JSON.stringify(JSON.parse(draftSetRaw), null, 2)
    } catch (error) {
      nextSetError = error instanceof Error ? error.message : t('flow.drawer.dslInvalidJson')
    }

    try {
      nextStateRaw = JSON.stringify(JSON.parse(draftStateRaw), null, 2)
    } catch (error) {
      nextStateError = error instanceof Error ? error.message : t('flow.drawer.dslInvalidJson')
    }

    setRawDraftState({
      sourceSetRaw,
      draftSetRaw: nextSetRaw,
      setError: nextSetError,
      sourceStateRaw,
      draftStateRaw: nextStateRaw,
      stateError: nextStateError,
    })
  }

  // ── Debounced bridge: drafts → reducer ──
  // Callback refs keep the debounce useEffect deps stable across drawer
  // re-renders (the parent passes inline arrows that change identity every
  // render). Without this, every dispatch that re-renders the drawer would
  // re-arm the timeout and the bridge would never actually fire.
  const lastDispatchedRef = useRef<{ setRaw: string; stateRaw: string } | null>(null)
  const lastErrorRef = useRef<boolean>(false)
  const onChangedRef = useRef(onDslRawChanged)
  const onClearedRef = useRef(onDslRawCleared)
  const onErrorRef = useRef(onDslRawErrorChanged)
  useEffect(() => { onChangedRef.current = onDslRawChanged }, [onDslRawChanged])
  useEffect(() => { onClearedRef.current = onDslRawCleared }, [onDslRawCleared])
  useEffect(() => { onErrorRef.current = onDslRawErrorChanged }, [onDslRawErrorChanged])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      // Live parse — surface error flag to the reducer regardless of dirty state.
      // The user could revert to a clean source while error was set; only what's
      // currently in the editor counts.
      let setIsValid = true
      let stateIsValid = true
      try { JSON.parse(draftSetRaw) } catch { setIsValid = false }
      try { JSON.parse(draftStateRaw) } catch { stateIsValid = false }
      const hasError = !setIsValid || !stateIsValid
      if (hasError !== lastErrorRef.current) {
        lastErrorRef.current = hasError
        onErrorRef.current(hasError)
      }

      // No dirty changes vs source → make sure no dsl-raw op is queued.
      if (!hasLocalChanges) {
        if (lastDispatchedRef.current !== null) {
          lastDispatchedRef.current = null
          onClearedRef.current()
        }
        return
      }
      if (hasError) return

      const prev = lastDispatchedRef.current
      if (prev && prev.setRaw === draftSetRaw && prev.stateRaw === draftStateRaw) return
      lastDispatchedRef.current = { setRaw: draftSetRaw, stateRaw: draftStateRaw }
      onChangedRef.current(draftSetRaw, draftStateRaw)
    }, DSL_DISPATCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [draftSetRaw, draftStateRaw, hasLocalChanges])

  return (
    <section className={`${FB_STUDIO.panel} h-full min-h-0 overflow-auto rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="m-0 text-sm font-semibold text-slate-800">{t('flow.drawer.dslTitle')}</h4>
        {hasPendingChanges ? (
          <span
            data-testid="dsl-pending-badge"
            data-pending-fingerprint={pendingDslRawFingerprint}
            className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
          >
            {t('flow.drawer.dslPending')}
          </span>
        ) : null}
      </div>
      <p className={`${FB_UI.hint} mb-2`}>{t('flow.drawer.dslHint')}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={`${FB_UI.secondaryButton} py-1.5 text-xs`} onClick={handleBeautify}>
          {t('flow.drawer.dslBeautify')}
        </button>
      </div>
      {hasLocalChanges ? <p className="m-0 mb-1 text-xs text-slate-500">{t('flow.drawer.dslDirty')}</p> : null}
      <div
        className="mb-2 flex gap-1.5"
        role="tablist"
        aria-label={t('flow.drawer.dslTitle')}
      >
        <button
          type="button"
          role="tab"
          id="dsl-tab-set"
          aria-selected={activeRootTab === 'set'}
          aria-controls="dsl-panel-set"
          tabIndex={activeRootTab === 'set' ? 0 : -1}
          className={buildTabButtonClass(activeRootTab === 'set')}
          onClick={() => setActiveRootTab('set')}
        >
          {t('flow.drawer.dslSetLabel')}
          {setError ? (
            // Inline marker so the user can locate the broken tab while Save
            // is gated. aria-label gives screen readers an explicit error cue.
            <span
              aria-label={t('flow.drawer.dslInvalidJson')}
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-600"
            />
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="dsl-tab-state"
          aria-selected={activeRootTab === 'state'}
          aria-controls="dsl-panel-state"
          tabIndex={activeRootTab === 'state' ? 0 : -1}
          className={buildTabButtonClass(activeRootTab === 'state')}
          onClick={() => setActiveRootTab('state')}
        >
          {t('flow.drawer.dslStateLabel')}
          {stateError ? (
            <span
              aria-label={t('flow.drawer.dslInvalidJson')}
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-600"
            />
          ) : null}
        </button>
      </div>
      <div role="tabpanel" id={`dsl-panel-${activeRootTab}`} aria-labelledby={`dsl-tab-${activeRootTab}`}>
      {activeRootError ? <p className="m-0 mb-1 text-xs text-red-700">{activeRootError}</p> : null}
      <JsonCodeEditor
        value={activeDraftRaw}
        onChange={
          activeRootTab === 'set'
            ? setDraftSetRaw
            : activeRootTab === 'state'
              ? setDraftStateRaw
              : () => {}
        }
        height="clamp(420px, 62vh, 780px)"
      />
      </div>
    </section>
  )
})
