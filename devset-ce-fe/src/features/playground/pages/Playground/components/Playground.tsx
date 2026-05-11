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
// Playground — main child component
//
// This is a pure presentational component. It receives all data
// and callbacks via props — it never calls usePlaygroundPage()
// or any other hook that manages state. It only renders the UI:
//   - Source mode selector (workflow / json)
//   - Workflow dropdown or JSON editor button
//   - Preview button
//   - Monitoring panel (if data is available)
//   - JSON editor modal
//
// Wrapped in React.memo() to prevent unnecessary re-renders
// when parent props haven't changed.
// ──────────────────────────────────────────────────────────────

import React from 'react'
import { ModalShell } from '../../../../flow-builder/components/ModalShell'
import { JsonCodeEditor } from '../../../../flow-builder/components/JsonCodeEditor'
import { PipelineMonitoringPanel } from '../../../../../shared/components/PipelineMonitoringPanel'
import type { PlaygroundProps, PlaygroundSourceMode } from '../state/Playground.types'

export const Playground = React.memo(function Playground({
  labels,
  sourceMode,
  workflows,
  selectedWorkflowId,
  isLoadingWorkflows,
  isPreviewLoading,
  error,
  originNote,
  isJsonModalOpen,
  customDslDraft,
  canPreview,
  monitoring,
  onSourceModeChange,
  onSelectedWorkflowIdChange,
  onOpenJsonModal,
  onCloseJsonModal,
  onCustomDslDraftChange,
  onResetJsonDraft,
  onSaveJsonDraft,
  onPreview,
}: PlaygroundProps) {
  return (
    <div className="playground-layout">
      <section className="playground-card" aria-label={labels.sourceMode}>
        <div className="playground-controls">
          <label className="playground-control">
            <span>{labels.sourceMode}</span>
            <select
              value={sourceMode}
              onChange={(event) => onSourceModeChange(event.target.value as PlaygroundSourceMode)} // SAFETY: select options are constrained to PlaygroundSourceMode values
            >
              <option value="workflow">{labels.sourceModeWorkflow}</option>
              <option value="json">{labels.sourceModeJson}</option>
            </select>
          </label>

          {sourceMode === 'workflow' ? (
            <label className="playground-control">
              <span>{labels.workflowSelect}</span>
              <select
                value={selectedWorkflowId}
                onChange={(event) => onSelectedWorkflowIdChange(event.target.value)}
                disabled={isLoadingWorkflows || workflows.length === 0}
              >
                {workflows.length > 0 ? (
                  workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.label}
                    </option>
                  ))
                ) : (
                  <option value="">{labels.workflowEmpty}</option>
                )}
              </select>
            </label>
          ) : (
            <button type="button" className="runs-cta runs-cta-secondary" onClick={onOpenJsonModal}>
              {labels.openJsonModal}
            </button>
          )}

          <button
            type="button"
            className="runs-cta runs-cta-primary playground-simulate-btn"
            onClick={onPreview}
            disabled={isPreviewLoading || !canPreview}
          >
            {isPreviewLoading ? labels.previewing : labels.preview}
          </button>
        </div>

        {originNote ? <p className="playground-origin-note">{originNote}</p> : null}
        {error ? <p className="playground-error">{error}</p> : null}
      </section>

      {monitoring ? <PipelineMonitoringPanel {...monitoring} /> : null}

      <ModalShell
        isOpen={isJsonModalOpen}
        title={labels.jsonModalTitle}
        subtitle={labels.jsonModalSubtitle}
        onClose={onCloseJsonModal}
        zIndexClassName="z-[82]"
        containerClassName="max-h-[88vh] max-w-[980px] gap-3"
      >
        <JsonCodeEditor value={customDslDraft} onChange={onCustomDslDraftChange} height="58vh" />
        <footer className="playground-modal-actions">
          <button type="button" className="runs-cta runs-cta-secondary" onClick={onResetJsonDraft}>
            {labels.clearJson}
          </button>
          <button type="button" className="runs-cta runs-cta-primary" onClick={onSaveJsonDraft}>
            {labels.saveJson}
          </button>
        </footer>
      </ModalShell>
    </div>
  )
})
