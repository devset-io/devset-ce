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
import type { DispatchHistoryPanelProps } from '../../../types/messageDispatch.view.types'

export const DispatchHistoryPanel = React.memo(function DispatchHistoryPanel({
  labels,
  historyError,
  isHistoryLoading,
  isHistoryRefreshing,
  historySearchQuery,
  historyMessageTypeFilter,
  historyContentTypeFilter,
  historyItemsCount,
  filteredHistoryItems,
  isSending,
  onRefresh,
  onSearchQueryChange,
  onMessageTypeFilterChange,
  onContentTypeFilterChange,
  onClearFilters,
  onPreview,
  onLoad,
}: DispatchHistoryPanelProps) {
  return (
    <aside className="dispatch-history-card">
      <div className="dispatch-history-head">
        <div>
          <h3>{labels.title}</h3>
          <p className="dispatch-history-hint">{labels.hint}</p>
        </div>
        <button
          type="button"
          className="runs-cta runs-cta-secondary"
          onClick={onRefresh}
          disabled={isHistoryLoading || isHistoryRefreshing}
        >
          {isHistoryRefreshing ? labels.refreshing : labels.refresh}
        </button>
      </div>
      <section className="dispatch-history-filters">
        <div className="dispatch-history-search-row">
          <label className="dispatch-label dispatch-history-search-label">
            {labels.search}
            <input
              value={historySearchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={labels.searchPlaceholder}
            />
          </label>
        </div>
        <div className="dispatch-history-filter-row">
          <label className="dispatch-label">
            {labels.broker}
            <select
              value={historyMessageTypeFilter}
              onChange={(event) =>
                onMessageTypeFilterChange(
                  event.target.value === 'rabbit'
                    ? 'rabbit'
                    : event.target.value === 'kafka'
                      ? 'kafka'
                      : 'all',
                )
              }
            >
              <option value="all">{labels.all}</option>
              <option value="kafka">Kafka</option>
              <option value="rabbit">Rabbit</option>
            </select>
          </label>
          <label className="dispatch-label">
            {labels.format}
            <select
              value={historyContentTypeFilter}
              onChange={(event) =>
                onContentTypeFilterChange(
                  event.target.value === 'application/x-protobuf'
                    ? 'application/x-protobuf'
                    : event.target.value === 'application/json'
                      ? 'application/json'
                      : 'all',
                )
              }
            >
              <option value="all">{labels.all}</option>
              <option value="application/json">JSON</option>
              <option value="application/x-protobuf">PROTOBUF</option>
            </select>
          </label>
          <button
            type="button"
            className="runs-cta runs-cta-secondary dispatch-history-clear-btn"
            onClick={onClearFilters}
            disabled={
              historySearchQuery.trim().length === 0 &&
              historyMessageTypeFilter === 'all' &&
              historyContentTypeFilter === 'all'
            }
          >
            {labels.clear}
          </button>
        </div>
      </section>
      <div className="dispatch-history-content">
        {historyError ? <p className="dispatch-error">{historyError}</p> : null}
        {isHistoryLoading ? <p className="dispatch-history-empty">{labels.loading}</p> : null}
        {!isHistoryLoading && historyItemsCount === 0 ? (
          <p className="dispatch-history-empty">{labels.empty}</p>
        ) : null}
        {!isHistoryLoading && historyItemsCount > 0 && filteredHistoryItems.length === 0 ? (
          <p className="dispatch-history-empty">{labels.emptyFiltered}</p>
        ) : null}

        {!isHistoryLoading && filteredHistoryItems.length > 0 ? (
          <div className="dispatch-history-list">
            {filteredHistoryItems.map((entry) => (
              <article key={entry.id} className="dispatch-history-item">
                <header className="dispatch-history-item-head">
                  <strong>{entry.formattedDate}</strong>
                  <div className="dispatch-history-item-actions">
                    <button
                      type="button"
                      className="runs-cta runs-cta-secondary"
                      onClick={() => onPreview(entry.id)}
                    >
                      {labels.preview}
                    </button>
                    <button
                      type="button"
                      className="runs-cta runs-cta-secondary"
                      onClick={() => onLoad(entry.id)}
                      disabled={isSending}
                    >
                      {labels.load}
                    </button>
                  </div>
                </header>
                <div className="dispatch-history-compact">
                  <p className="dispatch-history-title">
                    <strong>{entry.producerName}</strong>
                    <span className={`dispatch-history-chip ${entry.messageType === 'rabbit' ? 'is-rabbit' : 'is-kafka'}`}>
                      {entry.messageType.toUpperCase()}
                    </span>
                    <span className={`dispatch-history-chip ${entry.isProtobuf ? 'is-protobuf' : 'is-json'}`}>
                      {entry.contentTypeLabel}
                    </span>
                  </p>
                  <p className="dispatch-history-subtle">
                    {labels.destination}: <code>{entry.destinationLabel}</code> | {labels.run}:{' '}
                    <code>{entry.runIdShort}</code>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
})
