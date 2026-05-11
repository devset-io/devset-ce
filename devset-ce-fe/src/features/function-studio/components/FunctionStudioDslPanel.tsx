/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useState } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { DslStage } from '../../flow-builder/types.ts'
import { JsonCodeEditor } from '../../flow-builder/components/JsonCodeEditor.tsx'
import { buildTabButtonClass, FB_STUDIO, FB_UI } from '../../flow-builder/ui/ui-classes.ts'

type FunctionStudioDslPanelProps = {
  selectedStageDsl: DslStage | null
  hasPendingChanges: boolean
  onApplySelectedStageDslRaw: (setRaw: string, stateRaw: string) => void
}

export const FunctionStudioDslPanel = React.memo(function FunctionStudioDslPanel({
  selectedStageDsl,
  hasPendingChanges,
  onApplySelectedStageDslRaw,
}: FunctionStudioDslPanelProps) {
  const { t } = useI18n()
  const [activeRootTab, setActiveRootTab] = useState<'set' | 'state'>('set')
  const sourceSetRaw = JSON.stringify(selectedStageDsl?.set ?? {}, null, 2)
  const sourceStateRaw = JSON.stringify(selectedStageDsl?.state ?? {}, null, 2)
  const [rawDraftState, setRawDraftState] = useState<{
    sourceSetRaw: string
    draftSetRaw: string
    setError: string | null
    sourceStateRaw: string
    draftStateRaw: string
    stateError: string | null
    applyError: string | null
  }>({
    sourceSetRaw,
    draftSetRaw: sourceSetRaw,
    setError: null,
    sourceStateRaw,
    draftStateRaw: sourceStateRaw,
    stateError: null,
    applyError: null,
  })
  const draftSetRaw = rawDraftState.sourceSetRaw === sourceSetRaw ? rawDraftState.draftSetRaw : sourceSetRaw
  const draftStateRaw =
    rawDraftState.sourceStateRaw === sourceStateRaw ? rawDraftState.draftStateRaw : sourceStateRaw
  const setError = rawDraftState.sourceSetRaw === sourceSetRaw ? rawDraftState.setError : null
  const stateError = rawDraftState.sourceStateRaw === sourceStateRaw ? rawDraftState.stateError : null
  const applyError =
    rawDraftState.sourceSetRaw === sourceSetRaw && rawDraftState.sourceStateRaw === sourceStateRaw
      ? rawDraftState.applyError
      : null
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
      applyError: null,
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
      applyError: null,
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
      applyError: null,
    })
  }

  const handleApply = () => {
    if (!selectedStageDsl) {
      return
    }
    if (hasPendingChanges) {
      setRawDraftState({
        sourceSetRaw,
        draftSetRaw,
        setError,
        sourceStateRaw,
        draftStateRaw,
        stateError,
        applyError: t('flow.drawer.dslApplyBlocked'),
      })
      return
    }

    try {
      onApplySelectedStageDslRaw(draftSetRaw, draftStateRaw)
      setRawDraftState({
        sourceSetRaw: draftSetRaw,
        draftSetRaw,
        setError: null,
        sourceStateRaw: draftStateRaw,
        draftStateRaw,
        stateError: null,
        applyError: null,
      })
    } catch (error) {
      setRawDraftState({
        sourceSetRaw,
        draftSetRaw,
        setError,
        sourceStateRaw,
        draftStateRaw,
        stateError,
        applyError: error instanceof Error ? error.message : t('flow.drawer.dslApplyError'),
      })
    }
  }

  return (
    <section className={`${FB_STUDIO.panel} h-full min-h-0 overflow-auto rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="m-0 text-sm font-semibold text-slate-800">{t('flow.drawer.dslTitle')}</h4>
        {hasPendingChanges ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {t('flow.drawer.dslPending')}
          </span>
        ) : null}
      </div>
      <p className={`${FB_UI.hint} mb-2`}>{t('flow.drawer.dslHint')}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={`${FB_UI.secondaryButton} py-1.5 text-xs`} onClick={handleBeautify}>
          {t('flow.drawer.dslBeautify')}
        </button>
        <button
          type="button"
          className={`${FB_UI.primaryButton} py-1.5 text-xs`}
          onClick={handleApply}
          disabled={!selectedStageDsl || !hasLocalChanges || hasPendingChanges}
        >
          {t('flow.drawer.dslApply')}
        </button>
      </div>
      {hasLocalChanges ? <p className="m-0 mb-1 text-xs text-slate-500">{t('flow.drawer.dslDirty')}</p> : null}
      {applyError ? <p className="m-0 mb-1 text-xs text-red-700">{applyError}</p> : null}
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
