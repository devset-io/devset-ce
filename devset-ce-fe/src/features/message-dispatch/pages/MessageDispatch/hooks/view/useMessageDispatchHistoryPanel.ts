/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import {
  formatHistoryDate,
  toContentTypeLabel,
  toPrettyJson,
  toShortId,
  toWireFormatLabel,
} from '../../../../message-dispatch.utils'
import type { MessageDispatchCallbacks } from '../../../../types/dispatch.adapter.types'
import type { SingleStepHistoryEntry } from '../../../../services/message-dispatch.service'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import type {
  DispatchHistoryItemViewModel,
  DispatchHistoryPanelLabels,
  DispatchHistoryPanelProps,
  DispatchHistoryPreviewModalLabels,
  DispatchHistoryPreviewModalProps,
  DispatchHistoryPreviewViewModel,
} from '../../../../types/messageDispatch.view.types'

type UseMessageDispatchHistoryPanelOptions = {
  historyLabels: DispatchHistoryPanelLabels
  historyPreviewLabels: DispatchHistoryPreviewModalLabels
  state: MessageDispatchState
  derived: {
    filteredHistoryItems: SingleStepHistoryEntry[]
    previewHistoryEntry: SingleStepHistoryEntry | null
  }
  callbacks: MessageDispatchCallbacks
}

type UseMessageDispatchHistoryPanelResult = {
  historyPanel: DispatchHistoryPanelProps
  historyPreviewModal: DispatchHistoryPreviewModalProps
}

export function useMessageDispatchHistoryPanel({
  historyLabels,
  historyPreviewLabels,
  state,
  derived,
  callbacks,
}: UseMessageDispatchHistoryPanelOptions): UseMessageDispatchHistoryPanelResult {
  const historyItems = useMemo<DispatchHistoryItemViewModel[]>(
    () =>
      derived.filteredHistoryItems.map((entry) => ({
        id: entry.id,
        formattedDate: formatHistoryDate(entry.createdAtEpochMillis),
        producerName: entry.producerName,
        messageType: entry.messageType,
        contentTypeLabel: toContentTypeLabel(entry.contentType),
        isProtobuf: entry.contentType === 'application/x-protobuf',
        destinationLabel:
          entry.messageType === 'kafka'
            ? entry.topic ?? entry.key ?? historyLabels.missing
            : entry.topic ?? entry.routingKey ?? entry.exchange ?? historyLabels.missing,
        runIdShort: toShortId(entry.runId),
      })),
    [historyLabels.missing, derived.filteredHistoryItems],
  )

  const previewHistoryEntry = useMemo<DispatchHistoryPreviewViewModel | null>(() => {
    if (!derived.previewHistoryEntry) {
      return null
    }

    return {
      formattedDate: formatHistoryDate(derived.previewHistoryEntry.createdAtEpochMillis),
      id: derived.previewHistoryEntry.id,
      runId: derived.previewHistoryEntry.runId,
      workflowId: derived.previewHistoryEntry.workflowId,
      producerName: derived.previewHistoryEntry.producerName,
      messageType: derived.previewHistoryEntry.messageType,
      contentType: derived.previewHistoryEntry.contentType,
      topic: derived.previewHistoryEntry.topic ?? historyPreviewLabels.missing,
      exchange: derived.previewHistoryEntry.exchange ?? historyPreviewLabels.missing,
      routingKey: derived.previewHistoryEntry.routingKey ?? historyPreviewLabels.missing,
      key: derived.previewHistoryEntry.key ?? historyPreviewLabels.missing,
      executions: derived.previewHistoryEntry.executions,
      stage: derived.previewHistoryEntry.stage,
      event: derived.previewHistoryEntry.event,
      schemaId: derived.previewHistoryEntry.schemaId ?? historyPreviewLabels.missing,
      protobufRootMessage:
        derived.previewHistoryEntry.protobufRootMessage ?? historyPreviewLabels.missing,
      wireFormatLabel: toWireFormatLabel(derived.previewHistoryEntry.wireFormat),
      state: toPrettyJson(derived.previewHistoryEntry.state),
      headers: toPrettyJson(derived.previewHistoryEntry.headers),
      workflowState: toPrettyJson(derived.previewHistoryEntry.workflowState),
    }
  }, [historyPreviewLabels.missing, derived.previewHistoryEntry])

  const handleHistoryLoad = (historyId: string) => {
    const entry = state.historyItems.find((historyEntry) => historyEntry.id === historyId) ?? null
    if (!entry) {
      return
    }

    callbacks.loadHistoryEntryToDispatch(entry)
  }

  return {
    historyPanel: {
      labels: historyLabels,
      historyError: state.historyError,
      isHistoryLoading: state.isHistoryLoading,
      isHistoryRefreshing: state.isHistoryRefreshing,
      historySearchQuery: state.historySearchQuery,
      historyMessageTypeFilter: state.historyMessageTypeFilter,
      historyContentTypeFilter: state.historyContentTypeFilter,
      historyItemsCount: state.historyItems.length,
      filteredHistoryItems: historyItems,
      isSending: state.isSending,
      onRefresh: () => {
        void callbacks.refreshHistory()
      },
      onSearchQueryChange: callbacks.setHistorySearchQuery,
      onMessageTypeFilterChange: callbacks.setHistoryMessageTypeFilter,
      onContentTypeFilterChange: callbacks.setHistoryContentTypeFilter,
      onClearFilters: callbacks.clearHistoryFilters,
      onPreview: callbacks.setPreviewHistoryId,
      onLoad: handleHistoryLoad,
    },
    historyPreviewModal: {
      labels: historyPreviewLabels,
      entry: previewHistoryEntry,
      onClose: () => {
        callbacks.setPreviewHistoryId(null)
      },
    },
  }
}
