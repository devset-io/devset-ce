/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useEffect, useRef } from 'react'
import type {
  DispatchRequestCardLabels,
  DispatchSaveModalViewModel,
} from '../../../types/messageDispatch.view.types'
import { useFocusTrap } from '../../../../../shared/hooks/useFocusTrap'

interface DispatchSaveModalProps {
  labels: DispatchRequestCardLabels
  saveModal: DispatchSaveModalViewModel
  isSavingSingleRequest: boolean
  onSaveModalClose: () => void
  onSaveModalSubmit: () => void | Promise<void>
  onSaveCollectionNameChange: (value: string) => void
  onSaveRequestNameChange: (value: string) => void
}

export const DispatchSaveModal = React.memo(function DispatchSaveModal({
  labels,
  saveModal,
  isSavingSingleRequest,
  onSaveModalClose,
  onSaveModalSubmit,
  onSaveCollectionNameChange,
  onSaveRequestNameChange,
}: DispatchSaveModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef, saveModal.isOpen)

  useEffect(() => {
    if (!saveModal.isOpen) return
    const controller = new AbortController()
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') onSaveModalClose()
      },
      { signal: controller.signal },
    )
    window.addEventListener(
      'mousedown',
      (e) => {
        if (dialogRef.current && e.target instanceof Node && !dialogRef.current.contains(e.target)) onSaveModalClose()
      },
      { signal: controller.signal },
    )
    return () => controller.abort()
  }, [saveModal.isOpen, onSaveModalClose])

  if (!saveModal.isOpen) return null

  return (
    <div className="dispatch-save-modal-backdrop">
      <section
        ref={dialogRef}
        className="dispatch-save-modal"
        role="dialog"
        aria-modal="true"
        aria-label={labels.saveModalAria}
        tabIndex={-1}
      >
        <header className="dispatch-save-modal-head">
          <div>
            <h4>{labels.saveModalTitle}</h4>
            <p>{labels.saveModalSubtitle}</p>
          </div>
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onSaveModalClose}
            disabled={isSavingSingleRequest}
          >
            {labels.close}
          </button>
        </header>

        <div className="dispatch-save-modal-grid">
          <label className="dispatch-label">
            {labels.collectionLabel}
            <input
              className="dispatch-head-input"
              value={saveModal.collectionName}
              onChange={(event) => onSaveCollectionNameChange(event.target.value)}
              placeholder={labels.collectionPlaceholder}
              list="dispatch-collections-options"
              disabled={isSavingSingleRequest}
            />
            <datalist id="dispatch-collections-options">
              {saveModal.collectionOptions.map((collectionName) => (
                <option key={collectionName} value={collectionName} />
              ))}
            </datalist>
          </label>

          <label className="dispatch-label">
            {labels.requestLabel}
            <input
              className="dispatch-head-input"
              value={saveModal.requestName}
              onChange={(event) => onSaveRequestNameChange(event.target.value)}
              placeholder={labels.requestPlaceholder}
              disabled={isSavingSingleRequest}
            />
          </label>
        </div>

        <footer className="dispatch-save-modal-actions">
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onSaveModalClose}
            disabled={isSavingSingleRequest}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-head-save-muted"
            onClick={() => void onSaveModalSubmit()}
            disabled={
              isSavingSingleRequest ||
              saveModal.collectionName.trim().length === 0 ||
              saveModal.requestName.trim().length === 0
            }
          >
            {isSavingSingleRequest ? labels.saving : labels.save}
          </button>
        </footer>
      </section>
    </div>
  )
})
