/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ConnectorStatus } from '../../../shared/services/kafka-connectors.service'
import type { DslPayload, ExistingWorkflowOption } from '../../flow-builder/types'
import type { KafkaConnectorState } from '../services/run-config.service'
import type { RunStatus } from '../types/workflowRuns.types'
import type { WorkflowRunCardViewModel } from '../types/workflowRuns.view.types'
import type { HeaderRow, KeyValue } from '../workflow-runs.utils'

/** Full state shape for the workflow runs feature. */
export interface WorkflowRunsState {
  connectorState: KafkaConnectorState
  selectedConnectorName: string
  isRunsHomeVisible: boolean
  isRunFocusedMode: boolean
  workflows: ExistingWorkflowOption[]
  isLoading: boolean
  error: string | null
  workflowName: string
  executionsRaw: string
  topicRaw: string
  topicSuggestions: string[]
  exchangeSuggestions: string[]
  routingKeyRaw: string
  exchangeRaw: string
  headerRowsByStageIndex: Record<number, HeaderRow[]>
  keyByStageIndex: Record<number, KeyValue>
  runStatus: RunStatus
  runError: string | null
  selectedWorkflowDsl: DslPayload | null
  workflowPreviewError: string | null
  isWorkflowPreviewLoading: boolean
  editingParamsStageIndex: number | null
  isSavingParamsModal: boolean
  currentRunId: string | null
}

/** Discriminated union of all workflow runs actions. */
export type WorkflowRunsAction =
  | { type: 'init' }
  | { type: 'initSuccess'; workflows: ExistingWorkflowOption[]; connectorState: KafkaConnectorState }
  | { type: 'initFailed'; error: string }
  | { type: 'connectorStateLoaded'; connectorState: KafkaConnectorState }
  | { type: 'connectorStateLoadFailed'; error: string }
  | { type: 'connectorActiveChanged'; activeConnectorName: string | null }
  | { type: 'connectorSelected'; name: string }
  | { type: 'topicSuggestionsLoaded'; connectorName: string; topics: string[] }
  | { type: 'rabbitBrokerResourcesLoaded'; connectorName: string; queues: string[]; exchanges: string[] }
  | { type: 'routeCreateNew' }
  | { type: 'routeHome' }
  | { type: 'routeOpenRun'; runId: string }
  | { type: 'routeRunStatusLoaded'; status: RunStatus; errorMessage: string | null }
  | { type: 'routeRunStatusFailed'; error: string }
  | { type: 'workflowNameChanged'; name: string }
  | { type: 'workflowPreviewLoaded'; dsl: DslPayload; headerRows: Record<number, HeaderRow[]>; keys: Record<number, KeyValue> }
  | { type: 'workflowPreviewFailed'; error: string }
  | { type: 'executionsRawChanged'; value: string }
  | { type: 'topicRawChanged'; value: string }
  | { type: 'routingKeyRawChanged'; value: string }
  | { type: 'exchangeRawChanged'; value: string }
  | { type: 'kafkaKeyChanged'; stageIndex: number; value: KeyValue }
  | { type: 'headerRowUpdated'; stageIndex: number; rowId: string; field: 'key' | 'value'; value: string }
  | { type: 'headerRowRemoved'; stageIndex: number; rowId: string; fallbackRow: HeaderRow }
  | { type: 'headerRowAdded'; stageIndex: number; newRow: HeaderRow }
  | { type: 'editParamsOpened'; stageIndex: number }
  | { type: 'editParamsClosed' }
  | { type: 'startRun' }
  | { type: 'runExecuteStarted'; runId: string }
  | { type: 'runStatusUpdated'; status: RunStatus }
  | { type: 'runCompleted' }
  | { type: 'runFailed'; error: string; wasStarted: boolean }
  | { type: 'runStopped' }
  | { type: 'runAborted' }
  | { type: 'stopRun' }
  | { type: 'stopRunSuccess'; status: RunStatus }
  | { type: 'stopRunRefreshed'; status: RunStatus }
  | { type: 'stopRunFailed'; error: string }
  | { type: 'saveHeaders' }
  | { type: 'saveHeadersSuccess'; dsl: DslPayload; headerRows: Record<number, HeaderRow[]>; keys: Record<number, KeyValue> }
  | { type: 'saveHeadersFailed' }
  | { type: 'externalStatusUpdate'; status: RunStatus }

/** View-ready data derived from workflow runs state. */
export interface WorkflowRunsViewData {
  executions: number
  selectedConnector: ConnectorStatus | null
  isKafkaConnector: boolean
  isConnectorActive: boolean
  isConnectorReady: boolean
  hasRabbitRoutingTarget: boolean
  rabbitRouteError: string | null
  canStart: boolean
  statusLabel: string
  statusClassName: string
  editingHeaderRows: HeaderRow[]
  editingKey: KeyValue
  paramsModalMaxWidth: number
  paramsModalSubtitle: string
  topicSuggestions: { value: string; label: string }[]
  exchangeSuggestions: { value: string; label: string }[]
  destinationLabel: string
  destinationHint: string
  activeRunCards: WorkflowRunCardViewModel[]
  completedRunCards: WorkflowRunCardViewModel[]
}
