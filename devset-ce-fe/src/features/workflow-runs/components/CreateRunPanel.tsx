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
import { HintInput } from '../../../shared/components/HintInput'
import type { CreateRunPanelProps } from '../types/workflowRuns.view.types'

export const CreateRunPanel = React.memo(function CreateRunPanel({
  labels,
  isRabbitConnector,
  destinationLabel,
  destinationHint,
  isLoading,
  error,
  runError,
  statusClassName,
  statusLabel,
  runStatus,
  workflows,
  workflowName,
  onWorkflowNameChange,
  connectors,
  selectedConnectorName,
  onConnectorChange,
  selectedConnector,
  isConnectorActive,
  executionsRaw,
  onExecutionsRawChange,
  topicRaw,
  topicSuggestions,
  onTopicRawChange,
  routingKeyRaw,
  onRoutingKeyRawChange,
  exchangeRaw,
  exchangeSuggestions,
  onExchangeRawChange,
  rabbitRouteError,
  canStart,
  onStartRun,
  onBack,
}: CreateRunPanelProps) {
  return (
    <section className="runs-card runs-card-config">
      <div className="runs-back-wrap">
        <button type="button" className="runs-cta runs-cta-secondary" onClick={onBack}>
          {labels.backToRuns}
        </button>
      </div>
      <h3>{labels.title}</h3>
      <p className="runs-hint">{labels.subtitle}</p>
      {isLoading ? <p className="runs-hint">{labels.loadingConfig}</p> : null}
      {error ? <p className="runs-error" role="alert">{error}</p> : null}
      {runError ? <p className="runs-error" role="alert">{runError}</p> : null}
      <p className={statusClassName}>
        {runStatus === 'running' ? <span className="runs-status-dot is-running" aria-hidden="true" /> : null}
        {labels.status}: {statusLabel}
      </p>

      <label className="runs-label">
        {labels.workflow}
        <select
          className="runs-workflow-select"
          value={workflowName}
          onChange={(event) => onWorkflowNameChange(event.target.value)}
          disabled={isLoading || workflows.length === 0}
        >
          {workflows.length > 0 ? (
            workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.label}
              </option>
            ))
          ) : (
            <option value="">{labels.noWorkflows}</option>
          )}
        </select>
      </label>

      <label className="runs-label">
        {labels.connector}
        <select
          className="runs-workflow-select"
          value={selectedConnectorName}
          onChange={(event) => onConnectorChange(event.target.value)}
          disabled={isLoading || connectors.length === 0 || runStatus === 'running'}
        >
          {connectors.length > 0 ? (
            connectors.map((connector) => (
              <option key={connector.name} value={connector.name}>
                {connector.name}
              </option>
            ))
          ) : (
            <option value="">{labels.noConnector}</option>
          )}
        </select>
      </label>

      {selectedConnector ? (
        <div className="runs-connector">
          <p>
            <strong>{labels.connectorLabel}:</strong> {selectedConnector.name}
          </p>
          <p>
            <strong>{labels.type}:</strong> {selectedConnector.type.toUpperCase()}
          </p>
          <p>
            <strong>{labels.endpoint}:</strong> {selectedConnector.endpoint}
          </p>
          <p>
            <strong>{labels.connection}:</strong>{' '}
            <span className={`runs-connector-status ${isConnectorActive ? 'is-on' : 'is-off'}`}>
              {isConnectorActive ? labels.enabled : labels.disabled}
            </span>
          </p>
          <p>
            <strong>{labels.producer}:</strong>{' '}
            <span className={`runs-connector-status ${selectedConnector.producerConnected ? 'is-on' : 'is-off'}`}>
              {selectedConnector.producerConnected ? labels.enabled : labels.disabled}
            </span>{' '}
            <strong>{labels.consumer}:</strong>{' '}
            <span className={`runs-connector-status ${selectedConnector.consumerConnected ? 'is-on' : 'is-off'}`}>
              {selectedConnector.consumerConnected ? labels.enabled : labels.disabled}
            </span>{' '}
            <strong>{labels.auth}:</strong>{' '}
            <span className={`runs-connector-status ${selectedConnector.authenticated ? 'is-on' : 'is-off'}`}>
              {selectedConnector.authenticated ? labels.enabled : labels.disabled}
            </span>
          </p>
        </div>
      ) : (
        <p className="runs-error" role="alert">{labels.noActiveConnector}</p>
      )}
      {selectedConnector && !selectedConnector.producerConnected ? (
        <p className="runs-error" role="alert">{labels.producerDisconnected}</p>
      ) : null}

      <label className="runs-label">
        {labels.executions}
        <input
          type="number"
          min={1}
          value={executionsRaw}
          onChange={(event) => onExecutionsRawChange(event.target.value)}
          disabled={runStatus === 'running'}
        />
        <span className="runs-inline-hint">{labels.executionsHint}</span>
      </label>

      <label className="runs-label">
        {destinationLabel}
        <HintInput
          value={topicRaw}
          onChange={onTopicRawChange}
          items={topicSuggestions}
          disabled={runStatus === 'running'}
          placeholder="entity-events"
        />
        <span className="runs-inline-hint">{destinationHint}</span>
      </label>
      {isRabbitConnector ? (
        <>
          <label className="runs-label">
            {labels.routingKey}
            <input
              value={routingKeyRaw}
              onChange={(event) => onRoutingKeyRawChange(event.target.value)}
              disabled={runStatus === 'running'}
              placeholder="entity.events.created"
            />
            <span className="runs-inline-hint">{labels.routingKeyHint}</span>
          </label>

          <label className="runs-label">
            {labels.exchange}
            <HintInput
              value={exchangeRaw}
              onChange={onExchangeRawChange}
              items={exchangeSuggestions}
              disabled={runStatus === 'running'}
              placeholder="events.exchange"
            />
            <span className="runs-inline-hint">{labels.exchangeHint}</span>
          </label>
          {rabbitRouteError ? <p className="runs-error" role="alert">{rabbitRouteError}</p> : null}
        </>
      ) : null}

      <div className="runs-actions">
        <button type="button" className="runs-cta runs-cta-primary" onClick={onStartRun} disabled={!canStart}>
          {runStatus === 'running' ? labels.starting : labels.start}
        </button>
      </div>
    </section>
  )
})
