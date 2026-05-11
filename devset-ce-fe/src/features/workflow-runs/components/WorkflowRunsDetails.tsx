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
import { Background, Controls, ReactFlow } from '@xyflow/react'
import { ModalShell } from '../../flow-builder/components/ModalShell'
import { KeyModeInput } from '../../../shared/components/KeyModeInput'
import { CreateRunPanel } from './CreateRunPanel'
import { RunEventsPanel } from './RunEventsPanel'
import type { WorkflowRunsDetailsProps } from '../types/workflowRuns.view.types'

export const WorkflowRunsDetails = React.memo(function WorkflowRunsDetails({
  labels,
  colorMode,
  isRunFocusedMode,
  error,
  runError,
  statusClassName,
  statusLabel,
  runStatus,
  createRunPanel,
  workflowPreviewLoading,
  workflowPreviewError,
  workflowGraph,
  onPreviewNodeSelect,
  onBack,
  isParamsModalOpen,
  paramsModalSubtitle,
  paramsModalMaxWidth,
  editingHeaderRows,
  editingKey,
  onKafkaKeyChange,
  onCloseParamsModal,
  onSaveParamsModal,
  isSavingParamsModal,
  onUpdateHeaderRow,
  onRemoveHeaderRow,
  onAddHeaderRow,
  runEventsPanel,
  onStopRun,
}: WorkflowRunsDetailsProps) {
  return (
    <div className="runs-layout">
      {!isRunFocusedMode ? (
        <div className="runs-top">
          <CreateRunPanel {...createRunPanel} />

          <section className="runs-card runs-card-preview">
            <h3>{labels.previewTitle}</h3>
            <p className="runs-hint">{labels.previewHint}</p>
            {workflowPreviewLoading ? <p className="runs-hint">{labels.previewLoading}</p> : null}
            {workflowPreviewError ? <p className="runs-error" role="alert">{workflowPreviewError}</p> : null}
            <div className="runs-flow-preview">
              {workflowGraph.nodes.length > 0 ? (
                <ReactFlow
                  colorMode={colorMode}
                  nodes={workflowGraph.nodes}
                  edges={workflowGraph.edges}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  panOnDrag
                  zoomOnScroll
                  zoomOnPinch
                  onNodeClick={(_, node) => onPreviewNodeSelect(node.id)}
                >
                  <Background color="var(--flow-grid)" gap={22} />
                  <Controls />
                </ReactFlow>
              ) : (
                <p className="runs-hint">{labels.noPipeline}</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="runs-card runs-focused-head">
          {error ? <p className="runs-error" role="alert">{error}</p> : null}
          {runError ? <p className="runs-error" role="alert">{runError}</p> : null}
          <div className="runs-focused-toolbar">
            <div className="runs-focused-nav">
              <button type="button" className="runs-cta runs-cta-secondary runs-stop-compact" onClick={onBack}>
                {labels.backToRuns}
              </button>
              <button
                type="button"
                className="runs-stop runs-stop-compact"
                onClick={onStopRun}
                disabled={runStatus !== 'running'}
              >
                {labels.stopRun}
              </button>
            </div>
            <p className={`${statusClassName} runs-status-compact`}>
              {runStatus === 'running' ? <span className="runs-status-dot is-running" aria-hidden="true" /> : null}
              {labels.status}: {statusLabel}
            </p>
          </div>
        </section>
      )}

      {isRunFocusedMode ? <RunEventsPanel {...runEventsPanel} /> : null}

      <ModalShell
        isOpen={isParamsModalOpen}
        title={labels.kafkaParams}
        subtitle={paramsModalSubtitle}
        onClose={onCloseParamsModal}
        zIndexClassName="z-[72]"
        containerClassName="max-h-[86vh] gap-3"
        containerStyle={{ maxWidth: `${paramsModalMaxWidth}px` }}
      >
        <div className="runs-params-scroll">
          <div className="runs-params-key-row">
            <label className="runs-params-key-label" htmlFor="runs-kafka-key-input">{labels.kafkaKey}</label>
            <KeyModeInput
              inputId="runs-kafka-key-input"
              modeGroupLabel={labels.kafkaKey}
              value={editingKey}
              onChange={onKafkaKeyChange}
              disabled={isSavingParamsModal}
            />
          </div>
          <div className="runs-params-columns">
            <span>{labels.headerKey}</span>
            <span>{labels.headerValue}</span>
            <span />
          </div>
          <div className="runs-params-modal">
            {editingHeaderRows.map((row) => (
              <div key={row.id} className="runs-header-row">
                <input
                  aria-label="Header key"
                  value={row.key}
                  onChange={(event) => onUpdateHeaderRow(row.id, 'key', event.target.value)}
                  placeholder="header-key"
                />
                <input
                  aria-label="Header value"
                  value={row.value}
                  onChange={(event) => onUpdateHeaderRow(row.id, 'value', event.target.value)}
                  placeholder="value"
                />
                <button type="button" onClick={() => onRemoveHeaderRow(row.id)}>
                  {labels.remove}
                </button>
              </div>
            ))}
          </div>
        </div>
        <footer className="runs-params-actions">
          <button
            type="button"
            className="runs-cta runs-cta-secondary runs-params-btn"
            onClick={onAddHeaderRow}
            disabled={isSavingParamsModal}
          >
            {labels.addHeader}
          </button>
          <button
            type="button"
            className="runs-cta runs-cta-primary runs-params-btn"
            onClick={onSaveParamsModal}
            disabled={isSavingParamsModal}
          >
            {isSavingParamsModal ? labels.saving : labels.done}
          </button>
        </footer>
      </ModalShell>
    </div>
  )
})
