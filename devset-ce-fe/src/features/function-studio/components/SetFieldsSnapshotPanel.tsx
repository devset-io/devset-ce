/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { SetEntry } from '../../flow-builder/types.ts'
import { buildPillButtonClass, FB_UI, pillClass } from '../../flow-builder/ui/ui-classes.ts'
import { useSetFieldsSnapshotState } from '../hooks/useSetFieldsSnapshotState.ts'
import { leafLabel, relativeLabel } from '../utils/function-studio.utils.ts'

type SetFieldsSnapshotPanelProps = {
  scopePath: string
  scopeTrail: string[]
  visibleEntries: SetEntry[]
  selectedEvent?: string
  availableEvents?: string[]
  isSchemaLoading?: boolean
  isSchemaSelectorDisabled?: boolean
  onSchemaChange?: (event: string) => void
  inheritedFields: string[]
  setRootFields: string[]
  hideSourceMode?: boolean
  hideTitle?: boolean
  sourceMode: 'none' | 'previous-stage'
  onSourceModeChange: (source: 'none' | 'previous-stage') => void
  selectedField: string | null
  onSelectField: (field: string) => void
  onScopeChange: (scopePath: string) => void
}

export const SetFieldsSnapshotPanel = React.memo(function SetFieldsSnapshotPanel({
  scopePath,
  scopeTrail,
  visibleEntries,
  selectedEvent,
  availableEvents = [],
  isSchemaLoading = false,
  isSchemaSelectorDisabled = false,
  onSchemaChange,
  inheritedFields,
  setRootFields,
  hideSourceMode = false,
  hideTitle = false,
  sourceMode,
  onSourceModeChange,
  selectedField,
  onSelectField,
  onScopeChange,
}: SetFieldsSnapshotPanelProps) {
  const { t } = useI18n()
  const {
    searchQuery,
    hideInheritedInRoot,
    hasSchemaSelector,
    filteredEntries,
    isInheritedEntry,
    setSearchQuery,
    setHideInheritedInRoot,
  } = useSetFieldsSnapshotState({
    scopePath,
    visibleEntries,
    inheritedFields,
    setRootFields,
    sourceMode,
    onSchemaChange,
    selectedEvent,
  })

  return (
    <section className="flex flex-col gap-2">
      {hideTitle ? null : <h4 className="mb-2 text-sm font-semibold text-slate-800">{t('flow.snapshot.title')}</h4>}
      {hasSchemaSelector ? (
        <label className={`${FB_UI.label} mb-2 block`}>
          {t('flow.inspector.labelEvent')}
          <select
            className={FB_UI.input}
            value={selectedEvent ?? ''}
            onChange={(event) => onSchemaChange?.(event.target.value)}
            disabled={isSchemaSelectorDisabled || isSchemaLoading || availableEvents.length === 0}
          >
            {availableEvents.length > 0 ? (
              availableEvents.map((eventName) => (
                <option key={eventName} value={eventName}>
                  {eventName}
                </option>
              ))
            ) : (
              <option value={selectedEvent ?? ''}>{selectedEvent || '-'}</option>
            )}
          </select>
        </label>
      ) : null}
      {!scopePath && !hideSourceMode ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <p className="m-0 text-xs font-semibold text-slate-700">{t('flow.snapshot.sourceMode')}</p>
              <span className="group relative inline-flex">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600"
                  aria-label="Source mode help"
                  tabIndex={0}
                >
                  i
                </span>
                <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-[320px] rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                  <strong className="block text-slate-800">{t('flow.snapshot.sourceHow')}</strong>
                  <span className="mt-1 block">
                    {t('flow.snapshot.sourceNone')}
                  </span>
                  <span className="mt-1 block">
                    {t('flow.snapshot.sourcePrevious')}
                  </span>
                  <span className="mt-1 block">
                    {t('flow.snapshot.sourceRootHint')}
                  </span>
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5" role="group" aria-label="Source mode">
                <button
                  type="button"
                  aria-pressed={sourceMode === 'none'}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                    sourceMode === 'none' ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => onSourceModeChange('none')}
                >
                  none
                </button>
                <button
                  type="button"
                  aria-pressed={sourceMode === 'previous-stage'}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                    sourceMode === 'previous-stage' ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => onSourceModeChange('previous-stage')}
                >
                  previous-stage
                </button>
              </div>
              {sourceMode === 'previous-stage' ? (
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    hideInheritedInRoot
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]/80'
                      : 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                  title={
                    hideInheritedInRoot
                      ? t('flow.snapshot.showInherited')
                      : t('flow.snapshot.hideInherited')
                  }
                  onClick={() => setHideInheritedInRoot((current) => !current)}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${hideInheritedInRoot ? 'bg-[var(--brand)]' : 'bg-amber-500'}`}
                  />
                  {hideInheritedInRoot ? t('flow.snapshot.hidden') : t('flow.snapshot.hide')}
                </button>
              ) : null}
            </div>
          </div>
          {sourceMode === 'previous-stage' ? (
            null
          ) : null}
        </div>
      ) : null}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={buildPillButtonClass(!scopePath)}
            onClick={() => onScopeChange('')}
          >
            root
          </button>
          {scopeTrail.map((tokenPath) => (
            <button
              key={tokenPath}
              type="button"
              className={buildPillButtonClass(scopePath === tokenPath)}
              onClick={() => onScopeChange(tokenPath)}
            >
              {leafLabel(tokenPath)}
            </button>
          ))}
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <label className="block w-[220px]">
            <input
              aria-label="Search fields"
              className={FB_UI.input}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('flow.snapshot.searchPlaceholder')}
            />
          </label>
        </div>
      </div>

      {filteredEntries.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {filteredEntries.map((entry) => (
            (() => {
              const rootField = entry.field.split(/[.[\]]/)[0]
              const isInheritedFromPreviousStage =
                !scopePath && sourceMode === 'previous-stage' && Boolean(rootField) && isInheritedEntry(entry.field)
              const shouldMarkMissingRequired = Boolean(entry.isMissingRequired) && sourceMode !== 'previous-stage'
              return (
            <button
              key={entry.field}
              type="button"
              className={`grid w-full cursor-pointer grid-cols-[74px_minmax(135px,0.8fr)_minmax(0,1.8fr)] items-center gap-2 rounded-lg border bg-white p-2 text-left transition ${
                selectedField === entry.field
                  ? 'border-[var(--brand)] shadow-[0_0_0_2px_var(--brand-soft)]'
                  : shouldMarkMissingRequired
                    ? 'border-red-300 hover:bg-red-50/50'
                    : isInheritedFromPreviousStage
                      ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-100/60'
                    : 'border-[var(--brand-border)] hover:bg-[var(--brand-soft)]/40'
              }`}
              onClick={() => {
                onSelectField(entry.field)
                if (entry.isContainer) {
                  onScopeChange(entry.field)
                }
              }}
            >
              <span className={pillClass(isInheritedFromPreviousStage ? 'inherited' : entry.kind)}>
                {isInheritedFromPreviousStage ? t('flow.snapshot.inherited') : entry.kind}
              </span>
              <strong
                className={`truncate text-sm ${
                  shouldMarkMissingRequired
                    ? 'text-red-700 underline decoration-red-500 decoration-2 underline-offset-2'
                    : isInheritedFromPreviousStage
                      ? 'text-amber-900'
                      : 'text-slate-800'
                }`}
              >
                {relativeLabel(entry.field, scopePath)}
              </strong>
              <code
                className={`block overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] ${
                  shouldMarkMissingRequired
                    ? 'bg-red-50 text-red-700'
                    : isInheritedFromPreviousStage
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                }`}
              >
                {entry.preview}
                {shouldMarkMissingRequired ? ` • ${t('flow.snapshot.required')}` : ''}
                {!shouldMarkMissingRequired && isInheritedFromPreviousStage ? ` • ${t('flow.snapshot.inheritedTag')}` : ''}
              </code>
            </button>
              )
            })()
          ))}
        </div>
      ) : visibleEntries.length > 0 ? (
        <p className="text-xs text-slate-500">{t('flow.snapshot.searchEmpty', { query: searchQuery })}</p>
      ) : (
        <p className="text-xs text-slate-500">{t('flow.snapshot.empty')}</p>
      )}
    </section>
  )
})
