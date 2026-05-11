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
import { DispatchCollectionsPanel } from './DispatchCollectionsPanel'
import { DispatchHistoryPanel } from './DispatchHistoryPanel'
import { DispatchHistoryPreviewModal } from './DispatchHistoryPreviewModal'
import { DispatchRequestCard } from './DispatchRequestCard'
import type { MessageDispatchProps } from '../../../types/messageDispatch.view.types'

export const MessageDispatch = React.memo(function MessageDispatch({
  isHistoryPanelOpen,
  collectionsPanel,
  requestCard,
  historyPanel,
  historyPreviewModal,
}: MessageDispatchProps) {
  return (
    <div
      className={`dispatch-layout ${isHistoryPanelOpen ? 'is-history-open' : 'is-history-closed'}`}
    >
      <div className="dispatch-main">
        <DispatchCollectionsPanel {...collectionsPanel} />
        <DispatchRequestCard {...requestCard} />
      </div>

      {isHistoryPanelOpen ? <DispatchHistoryPanel {...historyPanel} /> : null}

      <DispatchHistoryPreviewModal {...historyPreviewModal} />
    </div>
  )
})
