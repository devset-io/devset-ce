/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// PipelineEventLog — left panel with the list of events
//
// Shows a searchable, filterable list of events produced by
// the selected pipeline stage. Each event row displays its
// index and a compact JSON preview. Clicking a row selects
// that event and the details panel on the right updates.
// ──────────────────────────────────────────────────────────────

import React from 'react'
import type { EventSearchScope, PipelineEventLogProps } from '../../../types/pipelineMonitoring.types'

export const PipelineEventLog = React.memo(function PipelineEventLog({
  title,
  items,
  eventSearch,
  eventSearchScope,
  eventSearchScopeOptions,
  eventSearchPlaceholder,
  eventSearchScopeLabel,
  emptyText,
  onEventSearchChange,
  onEventSearchScopeChange,
  onSelectEvent,
}: PipelineEventLogProps) {
  return (
    <section className="playground-log-panel" aria-labelledby="playground-event-log-title">
      <div className="playground-log-head">
        <h4 id="playground-event-log-title">{title}</h4>
      </div>
      <div className="playground-event-search">
        <input
          value={eventSearch}
          onChange={(event) => onEventSearchChange(event.target.value)}
          placeholder={eventSearchPlaceholder}
          aria-label={eventSearchPlaceholder}
        />
        <select
          value={eventSearchScope}
          onChange={(event) => onEventSearchScopeChange(event.target.value as EventSearchScope)} // SAFETY: select options are constrained to EventSearchScope values
          aria-label={eventSearchScopeLabel}
        >
          {eventSearchScopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="playground-log-list">
        {items.length === 0 ? (
          <p className="playground-hint">{emptyText}</p>
        ) : (
          items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`playground-log-item ${item.isActive ? 'is-active' : ''}`}
              onClick={() => onSelectEvent(item.index)}
            >
              <strong>{item.indexLabel}</strong>
              <span>{item.preview}</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
})
