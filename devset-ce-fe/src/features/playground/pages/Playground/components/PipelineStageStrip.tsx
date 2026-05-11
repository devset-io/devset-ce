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
// PipelineStageStrip — horizontal row of stage selector pills
//
// Each pill represents one pipeline stage (e.g. "Stage 1: process-entity")
// plus a final "Result" pill. Clicking a pill selects that stage
// and the event log below updates to show events from that stage.
// ──────────────────────────────────────────────────────────────

import React from 'react'
import type { PipelineStageStripProps } from '../../../types/pipelineMonitoring.types'

export const PipelineStageStrip = React.memo(function PipelineStageStrip({ items, onSelectStage }: PipelineStageStripProps) {
  return (
    <div className="playground-stage-strip" role="group" aria-label="Pipeline stages">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`playground-stage-pill ${item.isActive ? 'is-active' : ''}`}
          aria-pressed={item.isActive}
          onClick={() => onSelectStage(item.selection)}
        >
          <span>{item.eyebrow}</span>
          <strong>{item.title}</strong>
          <small>{item.meta}</small>
        </button>
      ))}
    </div>
  )
})
