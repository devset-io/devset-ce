/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useRef } from 'react'
import { QueryValueEditor } from '../../../../../shared/components/QueryValueEditor'
import { useDialogDismiss } from '../../../../../shared/hooks/useDialogDismiss'
import { useFocusTrap } from '../../../../../shared/hooks/useFocusTrap'
import type { DispatchCollectionContextModalProps } from '../../../types/messageDispatch.view.types'

const FIELD_INPUT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1 font-mono text-xs text-[var(--ink-900)] outline-none focus:border-[var(--brand)]'

export const DispatchCollectionContextModal = React.memo(function DispatchCollectionContextModal({
  labels,
  isOpen,
  isSaving,
  collectionName,
  entries,
  error,
  onClose,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onSubmit,
}: DispatchCollectionContextModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef, isOpen)
  useDialogDismiss(dialogRef, isOpen, onClose, { closeOnOutsideClick: true })

  if (!isOpen) return null

  const editorLabels = {
    modeLiteral: labels.modeLiteral,
    modePath: labels.modePath,
    modeFn: labels.modeFn,
  }
  const editorPlaceholders = { literal: labels.valuePlaceholder }

  return (
    <div className="dispatch-save-modal-backdrop">
      <section
        ref={dialogRef}
        className="dispatch-save-modal is-wide"
        role="dialog"
        aria-modal="true"
        aria-label={labels.modalAria}
        tabIndex={-1}
      >
        <header className="dispatch-save-modal-head">
          <div>
            <h4>{labels.title}</h4>
            <p>
              {labels.subtitle} <code>{collectionName}</code>
            </p>
          </div>
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {labels.close}
          </button>
        </header>

        <div>
          {entries.length === 0 ? (
            <p className="dispatch-collections-empty">{labels.empty}</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="border-b border-[var(--line-300)] py-1.5 last:border-b-0"
              >
                <div className="grid grid-cols-[1fr_2fr_28px] items-center gap-2">
                  <input
                    value={entry.field}
                    onChange={(e) => onUpdateEntry(entry.id, { field: e.target.value })}
                    placeholder={labels.fieldPlaceholder}
                    className={FIELD_INPUT_CLS}
                    disabled={isSaving}
                  />
                  <QueryValueEditor
                    value={entry.value}
                    onChange={(value) => onUpdateEntry(entry.id, { value })}
                    labels={editorLabels}
                    placeholders={editorPlaceholders}
                    disabled={isSaving}
                    layout="inline"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line-300)] text-[var(--ink-500)] hover:border-[#d37d8c] hover:bg-[#fff2f4] hover:text-[#b4233c]"
                    aria-label={labels.removeAria}
                    disabled={isSaving}
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={onAddEntry}
              className="runs-cta runs-cta-secondary"
              disabled={isSaving}
            >
              + {labels.addField}
            </button>
          </div>
          {error ? <p className="dispatch-error">{error}</p> : null}
        </div>

        <footer className="dispatch-save-modal-actions">
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-head-save-muted"
            onClick={() => void onSubmit()}
            disabled={isSaving}
          >
            {isSaving ? labels.saving : labels.save}
          </button>
        </footer>
      </section>
    </div>
  )
})
