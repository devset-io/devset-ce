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
import type { WorkflowRunsHomeProps } from '../types/workflowRuns.view.types'

export const WorkflowRunsHome = React.memo(function WorkflowRunsHome({
  labels,
  isLoading,
  error,
  activeRuns,
  completedRuns,
  onCreateNewRun,
  onOpenRun,
}: WorkflowRunsHomeProps) {
  return (
    <div className="runs-layout runs-layout-home">
      <section className="runs-card runs-home runs-home-compact">
        <div className="runs-home-head">
          <div>
            <h3>{labels.title}</h3>
            <p className="runs-hint">{labels.subtitle}</p>
          </div>
          <div className="runs-home-actions">
            <button type="button" className="runs-start runs-start-compact" onClick={onCreateNewRun}>
              {labels.newRun}
            </button>
          </div>
        </div>

        {isLoading ? <p className="runs-hint">{labels.loading}</p> : null}
        {error ? <p className="runs-error" role="alert">{error}</p> : null}

        <div className="runs-home-columns">
          <section className="runs-home-column">
            <h4 className="runs-home-column-title">{labels.active}</h4>
            {activeRuns.length === 0 ? (
              <p className="runs-hint">{labels.activeEmpty}</p>
            ) : (
              <div className="runs-home-grid">
                {activeRuns.map((run) => (
                  <button key={run.runId} type="button" className="runs-home-tile" onClick={() => onOpenRun(run.runId)}>
                    <p className="runs-home-title">{run.workflowLabel}</p>
                    <p className="runs-home-meta">
                      <span className={`runs-home-status runs-status-${run.uiStatus}`}>
                        {run.uiStatus === 'running' ? <span className="runs-status-dot is-running" aria-hidden="true" /> : null}
                        {run.statusLabel}
                      </span>
                    </p>
                    {run.progressText ? <p className="runs-home-meta">{run.progressText}</p> : null}
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="runs-home-column">
            <h4 className="runs-home-column-title">{labels.completed}</h4>
            {completedRuns.length === 0 ? (
              <p className="runs-hint">{labels.completedEmpty}</p>
            ) : (
              <div className="runs-home-grid">
                {completedRuns.map((run) => (
                  <button key={run.runId} type="button" className="runs-home-tile" onClick={() => onOpenRun(run.runId)}>
                    <p className="runs-home-title">{run.workflowLabel}</p>
                    <p className="runs-home-meta">
                      <span className={`runs-home-status runs-status-${run.uiStatus}`}>
                        {run.uiStatus === 'running' ? <span className="runs-status-dot is-running" aria-hidden="true" /> : null}
                        {run.statusLabel}
                      </span>
                    </p>
                    {run.resultText ? <p className="runs-home-meta">{run.resultText}</p> : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
})
