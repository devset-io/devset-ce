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
import type {
  DispatchRequestCardLabels,
  DispatchUpdateConfirmViewModel,
} from '../../../types/messageDispatch.view.types'
import { useDialogDismiss } from '../../../../../shared/hooks/useDialogDismiss'
import { useFocusTrap } from '../../../../../shared/hooks/useFocusTrap'

interface DispatchUpdateConfirmModalProps {
  labels: DispatchRequestCardLabels
  updateConfirm: DispatchUpdateConfirmViewModel
  isSavingSingleRequest: boolean
  onUpdateConfirmClose: () => void
  onUpdateConfirmSubmit: () => void | Promise<void>
}

/** Confirms overwriting the source saved request before an Update. */
export const DispatchUpdateConfirmModal = React.memo(function DispatchUpdateConfirmModal({
  labels,
  updateConfirm,
  isSavingSingleRequest,
  onUpdateConfirmClose,
  onUpdateConfirmSubmit,
}: DispatchUpdateConfirmModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef, updateConfirm.isOpen)
  useDialogDismiss(dialogRef, updateConfirm.isOpen, onUpdateConfirmClose, { closeOnOutsideClick: true })

  if (!updateConfirm.isOpen) return null

  return (
    <div className="dispatch-save-modal-backdrop">
      <section
        ref={dialogRef}
        className="dispatch-save-modal"
        role="dialog"
        aria-modal="true"
        aria-label={labels.updateConfirmAria}
        tabIndex={-1}
      >
        <header className="dispatch-save-modal-head">
          <div>
            <h4>{labels.updateConfirmTitle}</h4>
            <p>{updateConfirm.message}</p>
          </div>
        </header>

        <footer className="dispatch-save-modal-actions">
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onUpdateConfirmClose}
            disabled={isSavingSingleRequest}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-head-save-muted"
            onClick={() => void onUpdateConfirmSubmit()}
            disabled={isSavingSingleRequest}
          >
            {isSavingSingleRequest ? labels.saving : labels.update}
          </button>
        </footer>
      </section>
    </div>
  )
})
