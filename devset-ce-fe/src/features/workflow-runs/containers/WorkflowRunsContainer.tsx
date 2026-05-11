/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { WorkflowRuns } from '../components/WorkflowRuns'
import { useWorkflowRuns } from '../hooks/WorkflowRuns.hooks'
import type { WorkflowRunsHookLabels } from '../types/workflowRuns.view.types'

export function WorkflowRunsContainer() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { runId: routeRunId } = useParams<{ runId?: string }>()
  const isCreateRoute = location.pathname === '/runs/new'
  const colorMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'

  const labels = useMemo<WorkflowRunsHookLabels>(
    () => ({
      home: {
        title: t('runs.home.title'),
        subtitle: t('runs.home.subtitle'),
        newRun: t('runs.home.newRun'),
        loading: t('runs.home.loading'),
        active: t('runs.home.active'),
        activeEmpty: t('runs.home.activeEmpty'),
        completed: t('runs.home.completed'),
        completedEmpty: t('runs.home.completedEmpty'),
      },
      homeCard: {
        workflowFallback: t('runs.home.tile.workflowFallback'),
        resultWithErrors: t('runs.home.tile.result.withErrors'),
        resultOk: t('runs.home.tile.result.ok'),
      },
      create: {
        destinationRabbit: t('runs.create.destinationRabbit'),
        destinationKafka: t('runs.create.destinationKafka'),
        destinationRabbitHint: t('runs.create.destinationRabbitHint'),
        destinationKafkaHint: t('runs.create.destinationKafkaHint'),
        backToRuns: t('runs.create.backToRuns'),
        title: t('runs.create.title'),
        subtitle: t('runs.create.subtitle'),
        loadingConfig: t('runs.create.loadingConfig'),
        status: t('runs.create.status'),
        workflow: t('runs.create.workflow'),
        noWorkflows: t('runs.create.noWorkflows'),
        connector: t('runs.create.connector'),
        noConnector: t('runs.create.noConnector'),
        connectorLabel: t('runs.create.connectorLabel'),
        type: t('runs.create.type'),
        endpoint: t('runs.create.endpoint'),
        connection: t('runs.create.connection'),
        producer: t('runs.create.producer'),
        consumer: t('runs.create.consumer'),
        auth: t('runs.create.auth'),
        enabled: t('runs.create.enabled'),
        disabled: t('runs.create.disabled'),
        noActiveConnector: t('runs.create.noActiveConnector'),
        producerDisconnected: t('runs.create.producerDisconnected'),
        executions: t('runs.create.executions'),
        executionsHint: t('runs.create.executionsHint'),
        routingKey: t('runs.create.routingKey'),
        routingKeyHint: t('runs.create.routingKeyHint'),
        exchange: t('runs.create.exchange'),
        exchangeHint: t('runs.create.exchangeHint'),
        starting: t('runs.create.starting'),
        start: t('runs.create.start'),
      },
      details: {
        previewTitle: t('runs.details.previewTitle'),
        previewHint: t('runs.details.previewHint'),
        previewLoading: t('runs.details.previewLoading'),
        noPipeline: t('runs.details.noPipeline'),
        backToRuns: t('runs.details.backToRuns'),
        stopRun: t('runs.details.stopRun'),
        status: t('runs.details.status'),
        kafkaParams: t('runs.details.kafkaParams'),
        kafkaKey: t('runs.details.kafkaKey'),
        kafkaKeyHint: t('runs.details.kafkaKeyHint'),
        headerKey: t('runs.details.headerKey'),
        headerValue: t('runs.details.headerValue'),
        remove: t('runs.details.remove'),
        addHeader: t('runs.params.addHeader'),
        saving: t('runs.params.saving'),
        done: t('runs.params.done'),
      },
      previewGraph: {
        kafkaParams: t('runs.previewGraph.kafkaParams'),
        headersCount: t('runs.previewGraph.headersCount'),
        more: t('runs.previewGraph.more'),
        noHeaders: t('runs.previewGraph.noHeaders'),
        editHeaders: t('runs.previewGraph.editHeaders'),
      },
      runEvents: {
        selectRun: t('runs.events.selectRun'),
        loading: t('runs.events.loading'),
        execution: t('runs.events.execution'),
        eventsCount: t('runs.events.eventsCount'),
        noExecutionEvents: t('runs.events.noExecutionEvents'),
      },
      monitoring: {
        title: t('runs.events.panelTitle'),
        empty: t('runs.events.emptyExecution'),
        compiled: t('playground.monitor.compiled'),
        notCompiled: t('playground.monitor.notCompiled'),
        searchScopeLabel: t('playground.log.scope.label'),
        eventSearchPlaceholder: t('runs.events.searchEvents'),
        backToBuilder: null,
        stage: t('playground.stageStrip.stage'),
        events: t('playground.stageStrip.events'),
        result: t('playground.stageStrip.result'),
        finalResult: t('playground.stageStrip.final'),
        eventLogTitle: t('playground.log.title'),
        searchScopeBoth: t('playground.log.scope.both'),
        searchScopePayload: t('playground.log.scope.payload'),
        searchScopeHeader: t('playground.log.scope.header'),
        detailsTitle: t('playground.details.title'),
        range: t('playground.details.range'),
        rangeFinal: t('playground.details.range.final'),
        rangeProduced: t('playground.details.range.stage'),
        stageLabel: t('playground.details.stage'),
        stageFinal: t('playground.details.stage.final'),
        eventLabel: t('playground.details.event'),
        headerJson: t('playground.details.headerJson'),
        payloadJson: t('playground.details.payloadJson'),
        copy: t('playground.details.copy'),
      },
      errors: {
        loadRunStatus: t('runs.error.loadRunStatus'),
        loadConnectorState: t('runs.error.loadConnectorState'),
        loadRunConfig: t('runs.error.loadRunConfig'),
        loadWorkflowPreview: t('runs.error.loadWorkflowPreview'),
        stopRun: t('runs.error.stopRun'),
      },
      validation: {
        rabbitProducerName: t('runs.validation.rabbitProducerName'),
        rabbitRoutingTarget: t('runs.validation.rabbitRoutingTarget'),
        missingSchemaId: t('runs.validation.missingSchemaId'),
        missingSchemaInRepo: t('runs.validation.missingSchemaInRepo'),
        schemaNotProtobuf: t('runs.validation.schemaNotProtobuf'),
        schemaHasNoFields: t('runs.validation.schemaHasNoFields'),
        invalidSetFields: t('runs.validation.invalidSetFields'),
      },
      status: {
        idle: t('runs.status.idle'),
        running: t('runs.status.running'),
        stopping: t('runs.status.stopping'),
        stopped: t('runs.status.stopped'),
        completed: t('runs.status.completed'),
        failed: t('runs.status.failed'),
      },
      params: {
        stageLabel: t('runs.params.stageLabel'),
        unknownStage: t('runs.params.unknownStage'),
        editKafkaHeaders: t('runs.params.editKafkaHeaders'),
        saved: t('runs.params.toast.saved'),
        saveFailed: t('runs.params.toast.saveFailed'),
      },
      toast: {
        started: t('runs.toast.started'),
        finishedError: t('runs.toast.finishedError'),
        stopped: t('runs.toast.stopped'),
        completed: t('runs.toast.completed'),
        stopRequested: t('runs.toast.stopRequested'),
      },
    }),
    [t],
  )

  const viewModel = useWorkflowRuns({
    labels,
    routeRunId,
    isCreateRoute,
    colorMode,
    onOpenRun: (runId: string) => navigate(`/runs/${encodeURIComponent(runId)}`),
    onOpenRunsHome: () => navigate('/runs'),
    onOpenNewRun: () => navigate('/runs/new'),
    onNavigateToRunsHome: () => navigate('/runs'),
  })

  return <WorkflowRuns {...viewModel} />
}
