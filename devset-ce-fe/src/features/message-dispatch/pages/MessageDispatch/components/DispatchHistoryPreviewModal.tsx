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
import type { DispatchHistoryPreviewModalProps } from '../../../types/messageDispatch.view.types'
import { useDialogDismiss } from '../../../../../shared/hooks/useDialogDismiss'
import { useFocusTrap } from '../../../../../shared/hooks/useFocusTrap'

export const DispatchHistoryPreviewModal = React.memo(function DispatchHistoryPreviewModal({
  labels,
  entry,
  onClose,
}: DispatchHistoryPreviewModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const isOpen = entry != null
  useFocusTrap(dialogRef, isOpen)
  useDialogDismiss(dialogRef, isOpen, onClose, { closeOnOutsideClick: true })

  if (!entry) {
    return null
  }

  return (
    <div className="dispatch-history-modal-backdrop">
      <section
        ref={dialogRef}
        className="dispatch-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label={labels.modalAria}
        tabIndex={-1}
      >
        <header className="dispatch-history-modal-head">
          <div>
            <h4>{labels.title}</h4>
            <p>{entry.formattedDate}</p>
          </div>
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onClose}
          >
            {labels.close}
          </button>
        </header>

        <div className="dispatch-history-modal-grid">
          <p className="dispatch-history-meta">
            id: <code>{entry.id}</code>
          </p>
          <p className="dispatch-history-meta">
            runId: <code>{entry.runId}</code>
          </p>
          <p className="dispatch-history-meta">
            workflowId: <code>{entry.workflowId}</code>
          </p>
          <p className="dispatch-history-meta">
            {labels.producer}: <code>{entry.producerName}</code> | {labels.messageType}:{' '}
            <code>{entry.messageType}</code> | {labels.contentType}: <code>{entry.contentType}</code>
          </p>
          <p className="dispatch-history-meta">
            {labels.topic}: <code>{entry.topic}</code> | {labels.exchange}:{' '}
            <code>{entry.exchange}</code> | {labels.routingKey}: <code>{entry.routingKey}</code>
          </p>
          <p className="dispatch-history-meta">
            {labels.key}: <code>{entry.key}</code>
          </p>
          <p className="dispatch-history-meta">
            {labels.executions}: <code>{entry.executions}</code> | {labels.stage}: <code>{entry.stage}</code> |
            {' '}{labels.event}: <code>{entry.event}</code>
          </p>
          <p className="dispatch-history-meta">
            schemaId: <code>{entry.schemaId}</code> | protobufRootMessage: <code>{entry.protobufRootMessage}</code>
          </p>
          <p className="dispatch-history-meta">
            wireFormat: <code>{entry.wireFormatLabel}</code>
          </p>
        </div>

        <div className="dispatch-history-modal-block">
          <strong>{labels.state}</strong>
          <pre className="dispatch-history-state">{entry.state}</pre>
        </div>
        <div className="dispatch-history-modal-block">
          <strong>{labels.headers}</strong>
          <pre className="dispatch-history-state">{entry.headers}</pre>
        </div>
        <div className="dispatch-history-modal-block">
          <strong>{labels.workflowState}</strong>
          <pre className="dispatch-history-state">{entry.workflowState}</pre>
        </div>
      </section>
    </div>
  )
})
