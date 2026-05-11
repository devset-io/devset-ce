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
import { PipelineMonitoringPanel } from '../../../shared/components/PipelineMonitoringPanel'
import type { RunEventsPanelProps } from '../types/workflowRuns.view.types'

export const RunEventsPanel = React.memo(function RunEventsPanel({
  labels,
  runId,
  isLoading,
  error,
  executionTabs,
  monitoring,
  onSelectExecution,
}: RunEventsPanelProps) {
  return (
    <section className="runs-card runs-executions-card">
      {!runId ? <p className="runs-hint">{labels.selectRun}</p> : null}
      {isLoading ? <p className="runs-hint">{labels.loading}</p> : null}
      {error ? <p className="runs-error" role="alert">{error}</p> : null}

      {executionTabs.length > 0 ? (
        <>
          <div className="runs-execution-tabs">
            {executionTabs.map((execution) => (
              <button
                key={execution.key}
                type="button"
                className={`runs-execution-tab ${execution.isActive ? 'is-active' : ''}`}
                onClick={() => onSelectExecution(execution.executionIndex)}
              >
                <strong>{execution.label}</strong>
                <span>{execution.meta}</span>
              </button>
            ))}
          </div>

          {monitoring ? <PipelineMonitoringPanel {...monitoring} /> : <p className="runs-hint">{labels.noExecutionEvents}</p>}
        </>
      ) : null}
    </section>
  )
})
