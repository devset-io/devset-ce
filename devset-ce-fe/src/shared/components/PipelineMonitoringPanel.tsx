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
// PipelineMonitoringPanel — container for the monitoring UI
//
// Renders the header (title, subtitle, compiled badge),
// the stage strip (stage selector pills), and a two-column
// grid with the event log on the left and event details
// on the right.
//
// All data comes via props — this component has no state.
// ──────────────────────────────────────────────────────────────

import React from 'react'
import { PipelineEventDetails } from '../../features/playground/pages/Playground/components/PipelineEventDetails'
import { PipelineEventLog } from '../../features/playground/pages/Playground/components/PipelineEventLog'
import { PipelineStageStrip } from '../../features/playground/pages/Playground/components/PipelineStageStrip'
import type { PipelineMonitoringViewModel } from '../../features/playground/types/pipelineMonitoring.types'

/** Displays real-time pipeline execution stages and status. */
export const PipelineMonitoringPanel = React.memo(function PipelineMonitoringPanel({
  title,
  subtitle,
  compiledBadgeLabel,
  isCompiled,
  backToBuilderLabel,
  stageItems,
  eventLogTitle,
  eventSearch,
  eventSearchPlaceholder,
  eventSearchScope,
  eventSearchScopeLabel,
  eventSearchScopeOptions,
  eventItems,
  emptyText,
  details,
  onSelectStage,
  onSelectEvent,
  onEventSearchChange,
  onEventSearchScopeChange,
  onBackToBuilder,
}: PipelineMonitoringViewModel) {
  return (
    <section className="playground-monitor" aria-labelledby="playground-monitor-title">
      <header className="playground-monitor-head">
        <div>
          <h3 id="playground-monitor-title">{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="playground-monitor-head-actions">
          {backToBuilderLabel ? (
            <button type="button" className="runs-cta runs-cta-secondary" onClick={onBackToBuilder}>
              {backToBuilderLabel}
            </button>
          ) : null}
          {compiledBadgeLabel && isCompiled !== null ? (
            <span role="status" className={`playground-badge ${isCompiled ? 'is-ok' : 'is-fail'}`}>
              {compiledBadgeLabel}
            </span>
          ) : null}
        </div>
      </header>

      <PipelineStageStrip items={stageItems} onSelectStage={onSelectStage} />

      <div className="playground-monitor-grid">
        <PipelineEventLog
          title={eventLogTitle}
          items={eventItems}
          eventSearch={eventSearch}
          eventSearchScope={eventSearchScope}
          eventSearchScopeOptions={eventSearchScopeOptions}
          eventSearchPlaceholder={eventSearchPlaceholder}
          eventSearchScopeLabel={eventSearchScopeLabel}
          emptyText={emptyText}
          onEventSearchChange={onEventSearchChange}
          onEventSearchScopeChange={onEventSearchScopeChange}
          onSelectEvent={onSelectEvent}
        />

        <PipelineEventDetails details={details} />
      </div>
    </section>
  )
})
