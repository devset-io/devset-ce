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
import type { DispatchRequestCardLabels } from '../../../types/messageDispatch.view.types'

interface DispatchRequestHeadProps {
  labels: DispatchRequestCardLabels
  isHistoryPanelOpen: boolean
  loadedFromHistoryId: string | null
  selectedSingleRequestName: string | null
  loadedSingleRequestCollectionName: string | null
  isSending: boolean
  isSavingSingleRequest: boolean
  canSend: boolean
  saveActionKind: 'save' | 'update'
  onToggleHistory: () => void
  onSend: () => void | Promise<void>
  onSaveAction: () => void | Promise<void>
}

export const DispatchRequestHead = React.memo(function DispatchRequestHead({
  labels,
  isHistoryPanelOpen,
  loadedFromHistoryId,
  selectedSingleRequestName,
  loadedSingleRequestCollectionName,
  isSending,
  isSavingSingleRequest,
  canSend,
  saveActionKind,
  onToggleHistory,
  onSend,
  onSaveAction,
}: DispatchRequestHeadProps) {
  return (
    <div className="dispatch-request-head">
      <div>
        <h3>{labels.title}</h3>
        <p>{labels.subtitle}</p>
        {loadedFromHistoryId ? (
          <p className="dispatch-history-loaded">
            {labels.loadedFromHistory}: <code>{loadedFromHistoryId}</code>
          </p>
        ) : null}
        {!loadedFromHistoryId && selectedSingleRequestName && loadedSingleRequestCollectionName ? (
          <p className="dispatch-history-loaded">
            {labels.loadedSingleRequest}: <code>{selectedSingleRequestName}</code>{' '}
            {labels.fromCollection}: <code>{loadedSingleRequestCollectionName}</code>
          </p>
        ) : null}
      </div>
      <div className="dispatch-head-actions">
        <button
          type="button"
          className="runs-cta runs-cta-primary dispatch-send-head dispatch-send-emphasis"
          onClick={() => void onSend()}
          disabled={!canSend}
        >
          {isSending ? labels.sending : labels.send}
        </button>
        <div className="dispatch-head-secondary-row">
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-head-save-btn dispatch-head-save-muted"
            onClick={() => void onSaveAction()}
            disabled={isSending || isSavingSingleRequest}
          >
            {saveActionKind === 'update' ? labels.update : labels.save}
          </button>
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-history-toggle-btn"
            aria-expanded={isHistoryPanelOpen}
            onClick={onToggleHistory}
            disabled={isSending}
          >
            {isHistoryPanelOpen ? labels.hideHistory : labels.history}
          </button>
        </div>
      </div>
    </div>
  )
})
