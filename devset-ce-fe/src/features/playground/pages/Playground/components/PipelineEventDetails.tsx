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
// PipelineEventDetails — right panel with event details
//
// Shows the full details of the selected event:
//   - Metadata (range, stage, event index)
//   - Header JSON (read-only CodeEditor)
//   - Payload JSON (read-only CodeEditor)
//
// When no event is selected, shows a placeholder message.
// ──────────────────────────────────────────────────────────────

import React, { useCallback } from 'react'
import { CodeEditor } from '../../../../../shared/components/CodeEditor'
import type { PipelineEventDetailsProps } from '../../../types/pipelineMonitoring.types'

const NOOP = () => {}

export const PipelineEventDetails = React.memo(function PipelineEventDetails({
  details,
}: PipelineEventDetailsProps) {
  const handleCopyHeader = useCallback(() => {
    if (!details.headerJsonText) return
    void navigator.clipboard.writeText(details.headerJsonText)
  }, [details.headerJsonText])

  const handleCopyPayload = useCallback(() => {
    if (!details.payloadText) return
    void navigator.clipboard.writeText(details.payloadText)
  }, [details.payloadText])

  return (
    <aside className="playground-details-panel">
      <h4>{details.title}</h4>
      {details.hasActiveEvent ? (
        <>
          <div className="playground-detail-meta">
            <p>
              <span>{details.rangeLabel}</span>
              <strong>{details.rangeValue}</strong>
            </p>
            <p>
              <span>{details.stageLabel}</span>
              <strong>{details.stageValue}</strong>
            </p>
            <p>
              <span>{details.eventLabel}</span>
              <strong>{details.eventValue}</strong>
            </p>
          </div>
          <section className="playground-detail-block" aria-labelledby="playground-header-json-title">
            <div className="playground-payload-bar">
              <h5 id="playground-header-json-title">{details.headerTitle}</h5>
              <button type="button" className="klive-icon-btn" onClick={handleCopyHeader} aria-label={details.copyLabel}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M16 19v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
            <CodeEditor
              value={details.headerJsonText}
              onChange={NOOP}
              language="json"
              readOnly
              height="90px"
            />
          </section>
          <section className="playground-detail-block playground-detail-block-payload" aria-labelledby="playground-payload-json-title">
            <div className="playground-payload-bar">
              <h5 id="playground-payload-json-title">{details.payloadTitle}</h5>
              <button type="button" className="klive-icon-btn" onClick={handleCopyPayload} aria-label={details.copyLabel}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M16 19v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
            <CodeEditor
              value={details.payloadText}
              onChange={NOOP}
              language="json"
              readOnly
              height="calc(100vh - 480px)"
            />
          </section>
        </>
      ) : (
        <p className="playground-hint">{details.emptyText}</p>
      )}
    </aside>
  )
})
