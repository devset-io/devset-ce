/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useEffect, useId, useRef } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { useFocusTrap } from '../../../../../shared/hooks/useFocusTrap'
import { FB_UI } from '../../../ui/ui-classes'
import type { QueryConfig, WorkflowState } from '../../../types'
import { SELECT_CLS } from './db-query-editor/db-query.utils'
import { StepBadge } from './db-query-editor/StepBadge'
import { FindRow } from './db-query-editor/FindRow'
import { SelectRow } from './db-query-editor/SelectRow'
import { useDbQueryEditor } from './db-query-editor/useDbQueryEditor'

type DbQueryEditorModalProps = {
  isOpen: boolean
  stageName: string
  isEdit: boolean
  initialQuery: QueryConfig | null
  workflowState: WorkflowState
  onSave: (query: QueryConfig) => void
  onRemove: () => void
  onClose: () => void
}

export const DbQueryEditorModal = React.memo(function DbQueryEditorModal({
  isOpen,
  stageName,
  isEdit,
  initialQuery,
  workflowState,
  onSave,
  onRemove,
  onClose,
}: DbQueryEditorModalProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(dialogRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') onClose()
      },
      { signal: controller.signal },
    )
    window.addEventListener(
      'mousedown',
      (e) => {
        if (dialogRef.current && e.target instanceof Node && !dialogRef.current.contains(e.target)) onClose()
      },
      { signal: controller.signal },
    )
    return () => controller.abort()
  }, [isOpen, onClose])

  const {
    query,
    connectorNames,
    databases,
    collections,
    schemaFields,
    flatFields,
    stateKeys,
    isLoadingSchema,
    handleFetchSchema,
    handleConnectionChange,
    handleDatabaseChange,
    handleCollectionChange,
    addFindEntry,
    updateFindEntry,
    removeFindEntry,
    addSelectEntry,
    updateSelectEntry,
    removeSelectEntry,
    handleSave,
    handleRemoveQuery,
  } = useDbQueryEditor(isOpen, initialQuery, workflowState, onSave, onRemove, onClose)

  if (!isOpen) return null

  return (
    <div className={`${FB_UI.modalBackdrop} z-50`}>
      <div
        ref={dialogRef}
        className="flex w-full max-w-[1080px] max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-2xl border border-[var(--line-200)] bg-[var(--panel)] shadow-[0_30px_80px_rgba(8,18,12,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line-200)] px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)]">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                <path d="M12 3c1.6 4 5 6.5 5 11s-2.6 6.6-5 6.6S7 18.5 7 14 10.4 7 12 3z M12 3v17.6" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 id={titleId} className="m-0 text-base font-semibold">{t('flow.query.title')}</h3>
              <p className="mt-0.5 text-xs text-[var(--ink-500)]">
                {t('flow.query.subtitle', { stage: stageName })}
              </p>
            </div>
          </div>
          <button type="button" className={FB_UI.secondaryButton} onClick={onClose}>
            {t('flow.modal.close')}
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
          {/* Step 1: Source */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <StepBadge n={1} />
              <span className="text-sm font-semibold">{t('flow.query.source')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--ink-700)]">{t('flow.query.connection')}</span>
                <select
                  value={query.connection}
                  onChange={(e) => handleConnectionChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">{t('flow.query.selectConnection')}</option>
                  {connectorNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--ink-700)]">{t('flow.query.database')}</span>
                <select
                  value={query.database}
                  onChange={(e) => handleDatabaseChange(e.target.value)}
                  disabled={!query.connection || databases.length === 0}
                  className={SELECT_CLS}
                >
                  <option value="">{databases.length === 0 ? '—' : t('flow.query.selectDatabase')}</option>
                  {databases.map((db) => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--ink-700)]">{t('flow.query.collection')}</span>
                <select
                  value={query.collection}
                  onChange={(e) => handleCollectionChange(e.target.value)}
                  disabled={!query.database || collections.length === 0}
                  className={SELECT_CLS}
                >
                  <option value="">{collections.length === 0 ? '—' : t('flow.query.selectCollection')}</option>
                  {collections.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-[var(--ink-500)]">{t('flow.query.connectionsHint')}</p>
          </section>

          {/* Step 2: Map fields → state */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <StepBadge n={2} />
              <span className="text-sm font-semibold">{t('flow.query.mapFields')}</span>
              <span className="text-[11px] text-[var(--ink-500)]">{t('flow.query.mapFieldsHint')}</span>
            </div>

            {schemaFields.length === 0 && query.select.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--line-300)] bg-[var(--panel-deep)] px-6 py-8 text-center">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--line-300)] bg-[var(--panel-soft)] text-[var(--ink-500)]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <ellipse cx="12" cy="6" rx="7" ry="2.6" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </div>
                <h4 className="m-0 mb-1 text-sm font-semibold">{t('flow.query.noFieldsYet')}</h4>
                <p className="m-0 mb-3 max-w-[360px] text-xs text-[var(--ink-500)]">{t('flow.query.noFieldsDesc')}</p>
                <button
                  type="button"
                  onClick={handleFetchSchema}
                  disabled={isLoadingSchema || !query.collection}
                  className={`${FB_UI.primaryButton} inline-flex items-center gap-1.5 !py-1.5 !px-3 !text-xs`}
                >
                  {isLoadingSchema ? t('flow.query.loading') : t('flow.query.fetchFields')}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--line-300)] bg-[var(--panel)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--line-300)] bg-[var(--panel-soft)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--ink-800)]">
                    {t('flow.query.collectionFields')} — <span className="font-bold text-[var(--brand-ink)]">{query.select.length}</span>/{flatFields.length} {t('flow.query.mapped')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFetchSchema}
                      disabled={isLoadingSchema}
                      className={`${FB_UI.secondaryButton} !py-1 !px-2 !text-[11px] inline-flex items-center gap-1`}
                    >
                      {isLoadingSchema ? '...' : t('flow.query.refetch')}
                    </button>
                  </div>
                </div>

                {/* Select mapping header */}
                <div className="grid grid-cols-[1.1fr_18px_1.4fr_1.4fr_28px] items-center gap-2 border-b border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                  <span>Field</span>
                  <span />
                  <span>&rarr; State path</span>
                  <span>Default</span>
                  <span />
                </div>

                {query.select.length === 0 ? (
                  <div className="px-3 py-4 text-[11.5px] text-[var(--ink-500)]">
                    {t('flow.query.noMappings')}{' '}
                    <button type="button" onClick={addSelectEntry} className="font-semibold text-[var(--brand-ink)] hover:underline">
                      + {t('flow.query.addMapping')}
                    </button>
                  </div>
                ) : (
                  query.select.map((entry) => (
                    <SelectRow
                      key={entry.id}
                      entry={entry}
                      fieldOptions={flatFields}
                      stateKeys={stateKeys}
                      onUpdate={(patch) => updateSelectEntry(entry.id, patch)}
                      onRemove={() => removeSelectEntry(entry.id)}
                    />
                  ))
                )}

                <div className="border-t border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1.5">
                  <button
                    type="button"
                    onClick={addSelectEntry}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--line-300)] bg-[var(--panel)] px-2 py-1 text-[11.5px] font-semibold text-[var(--ink-700)] hover:border-[var(--brand-border)] hover:text-[var(--brand-ink)]"
                  >
                    + {t('flow.query.addMapping')}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Step 3: Filter */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <StepBadge n={3} />
              <span className="text-sm font-semibold">{t('flow.query.filter')}</span>
              <span className="text-[11px] text-[var(--ink-500)]">{t('flow.query.filterHint')}</span>
            </div>

            <div className="rounded-xl border border-[var(--line-300)] bg-[var(--panel)] overflow-hidden">
              <div className="grid grid-cols-[1.1fr_0.7fr_1.5fr_28px] items-center gap-2 border-b border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                <span>Field</span>
                <span>Op</span>
                <span>Value</span>
                <span />
              </div>

              {query.find.length === 0 ? (
                <div className="px-3 py-4 text-[11.5px] text-[var(--ink-500)]">
                  {t('flow.query.noFilters')}{' '}
                  <button type="button" onClick={addFindEntry} className="font-semibold text-[var(--brand-ink)] hover:underline">
                    + {t('flow.query.addFilter')}
                  </button>
                </div>
              ) : (
                query.find.map((entry) => (
                  <FindRow
                    key={entry.id}
                    entry={entry}
                    fieldOptions={flatFields}
                    stateKeys={stateKeys}
                    onUpdate={(patch) => updateFindEntry(entry.id, patch)}
                    onRemove={() => removeFindEntry(entry.id)}
                  />
                ))
              )}

              <div className="border-t border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1.5">
                <button
                  type="button"
                  onClick={addFindEntry}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--line-300)] bg-[var(--panel)] px-2 py-1 text-[11.5px] font-semibold text-[var(--ink-700)] hover:border-[var(--brand-border)] hover:text-[var(--brand-ink)]"
                >
                  + {t('flow.query.addFilter')}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--line-200)] bg-[var(--panel-soft)] px-5 py-3">
          <span className="text-[11.5px] text-[var(--ink-500)]">
            {query.select.length} {t('flow.query.fieldsWrittenToState')}
          </span>
          <div className="flex items-center gap-2">
            {isEdit ? (
              <button type="button" onClick={handleRemoveQuery} className="rounded-lg border border-[#d37d8c] bg-[#fff2f4] px-3 py-1.5 text-xs font-semibold text-[#b4233c] hover:bg-[#ffe4e8] dark:border-[#6b2a35] dark:bg-[#3a1c22] dark:text-[#f5b0bb]">
                {t('flow.query.removeQuery')}
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={`${FB_UI.secondaryButton} !py-1.5 !px-3 !text-xs`}>
              {t('flow.query.cancel')}
            </button>
            <button type="button" onClick={handleSave} className={`${FB_UI.primaryButton} !py-1.5 !px-3 !text-xs`}>
              {t('flow.query.saveNode')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
})
