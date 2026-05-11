/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { PipelineMonitoringLabels, PipelineMonitoringViewModel } from '../../../shared/types/pipelineMonitoring.types'
import type { Edge, Node } from '@xyflow/react'
import type { HeaderRow, KeyValue } from '../workflow-runs.utils'
import type {
  ConnectorStatus,
  ExistingWorkflowOption,
  RunStatus,
} from './workflowRuns.types'

export type WorkflowRunsHomeLabels = {
  title: string
  subtitle: string
  newRun: string
  loading: string
  active: string
  activeEmpty: string
  completed: string
  completedEmpty: string
}

export type WorkflowRunsHomeCardLabels = {
  workflowFallback: string
  resultWithErrors: string
  resultOk: string
}

export type CreateRunPanelLabels = {
  destinationRabbit: string
  destinationKafka: string
  destinationRabbitHint: string
  destinationKafkaHint: string
  backToRuns: string
  title: string
  subtitle: string
  loadingConfig: string
  status: string
  workflow: string
  noWorkflows: string
  connector: string
  noConnector: string
  connectorLabel: string
  type: string
  endpoint: string
  connection: string
  producer: string
  consumer: string
  auth: string
  enabled: string
  disabled: string
  noActiveConnector: string
  producerDisconnected: string
  executions: string
  executionsHint: string
  routingKey: string
  routingKeyHint: string
  exchange: string
  exchangeHint: string
  starting: string
  start: string
}

export type WorkflowRunsDetailsLabels = {
  previewTitle: string
  previewHint: string
  previewLoading: string
  noPipeline: string
  backToRuns: string
  stopRun: string
  status: string
  kafkaParams: string
  kafkaKey: string
  kafkaKeyHint: string
  headerKey: string
  headerValue: string
  remove: string
  addHeader: string
  saving: string
  done: string
}

export type WorkflowPreviewGraphLabels = {
  kafkaParams: string
  headersCount: string
  more: string
  noHeaders: string
  editHeaders: string
}

export type RunEventsPanelLabels = {
  selectRun: string
  loading: string
  execution: string
  eventsCount: string
  noExecutionEvents: string
}

export type WorkflowRunsHookLabels = {
  home: WorkflowRunsHomeLabels
  homeCard: WorkflowRunsHomeCardLabels
  create: CreateRunPanelLabels
  details: WorkflowRunsDetailsLabels
  previewGraph: WorkflowPreviewGraphLabels
  runEvents: RunEventsPanelLabels
  monitoring: PipelineMonitoringLabels
  errors: {
    loadRunStatus: string
    loadConnectorState: string
    loadRunConfig: string
    loadWorkflowPreview: string
    stopRun: string
  }
  validation: {
    rabbitProducerName: string
    rabbitRoutingTarget: string
    missingSchemaId: string
    missingSchemaInRepo: string
    schemaNotProtobuf: string
    schemaHasNoFields: string
    invalidSetFields: string
  }
  status: {
    idle: string
    running: string
    stopping: string
    stopped: string
    completed: string
    failed: string
  }
  params: {
    stageLabel: string
    unknownStage: string
    editKafkaHeaders: string
    saved: string
    saveFailed: string
  }
  toast: {
    started: string
    finishedError: string
    stopped: string
    completed: string
    stopRequested: string
  }
}

export type WorkflowRunCardViewModel = {
  runId: string
  workflowLabel: string
  statusLabel: string
  uiStatus: RunStatus
  progressText?: string
  resultText?: string
}

export type WorkflowRunsHomeProps = {
  labels: WorkflowRunsHomeLabels
  isLoading: boolean
  error: string | null
  activeRuns: WorkflowRunCardViewModel[]
  completedRuns: WorkflowRunCardViewModel[]
  onCreateNewRun: () => void
  onOpenRun: (runId: string) => void
}

export type CreateRunPanelProps = {
  labels: CreateRunPanelLabels
  isRabbitConnector: boolean
  destinationLabel: string
  destinationHint: string
  isLoading: boolean
  error: string | null
  runError: string | null
  statusClassName: string
  statusLabel: string
  runStatus: RunStatus
  workflows: ExistingWorkflowOption[]
  workflowName: string
  onWorkflowNameChange: (value: string) => void
  connectors: ConnectorStatus[]
  selectedConnectorName: string
  onConnectorChange: (value: string) => void
  selectedConnector: ConnectorStatus | null
  isConnectorActive: boolean
  executionsRaw: string
  onExecutionsRawChange: (value: string) => void
  topicRaw: string
  topicSuggestions: { value: string; label: string }[]
  onTopicRawChange: (value: string) => void
  routingKeyRaw: string
  onRoutingKeyRawChange: (value: string) => void
  exchangeRaw: string
  exchangeSuggestions: { value: string; label: string }[]
  onExchangeRawChange: (value: string) => void
  rabbitRouteError: string | null
  canStart: boolean
  onStartRun: () => void
  onBack: () => void
}

export type WorkflowPreviewGraphViewModel = {
  nodes: Node[]
  edges: Edge[]
}

export type RunEventsExecutionTabViewModel = {
  key: string
  executionIndex: number
  label: string
  meta: string
  isActive: boolean
}

export type RunEventsPanelProps = {
  labels: RunEventsPanelLabels
  runId: string | null
  isLoading: boolean
  error: string | null
  executionTabs: RunEventsExecutionTabViewModel[]
  monitoring: PipelineMonitoringViewModel | null
  onSelectExecution: (executionIndex: number) => void
}

export type WorkflowRunsDetailsProps = {
  labels: WorkflowRunsDetailsLabels
  colorMode: 'light' | 'dark'
  isRunFocusedMode: boolean
  error: string | null
  runError: string | null
  statusClassName: string
  statusLabel: string
  runStatus: RunStatus
  createRunPanel: CreateRunPanelProps
  workflowPreviewLoading: boolean
  workflowPreviewError: string | null
  workflowGraph: WorkflowPreviewGraphViewModel
  onPreviewNodeSelect: (nodeId: string) => void
  onBack: () => void
  isParamsModalOpen: boolean
  paramsModalSubtitle: string
  paramsModalMaxWidth: number
  editingHeaderRows: HeaderRow[]
  editingKey: KeyValue
  onKafkaKeyChange: (value: KeyValue) => void
  onCloseParamsModal: () => void
  onSaveParamsModal: () => void
  isSavingParamsModal: boolean
  onUpdateHeaderRow: (rowId: string, field: 'key' | 'value', value: string) => void
  onRemoveHeaderRow: (rowId: string) => void
  onAddHeaderRow: () => void
  runEventsPanel: RunEventsPanelProps
  onStopRun: () => void
}

export type WorkflowRunsProps = {
  isRunsHomeVisible: boolean
  home: WorkflowRunsHomeProps
  details: WorkflowRunsDetailsProps
}
