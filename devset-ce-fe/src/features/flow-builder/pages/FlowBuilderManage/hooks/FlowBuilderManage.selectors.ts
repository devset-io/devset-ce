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
import type {
  FlowBuilderManageLabels,
  FlowBuilderManageState,
  FlowBuilderManageViewData,
  FlowBuilderManageWorkflowViewModel,
} from '../state/FlowBuilderManage.types'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export function buildLabels(t: TranslateFn): FlowBuilderManageLabels {
  return {
    title: t('flow.manage.title'),
    subtitle: t('flow.manage.subtitle'),
    import: t('flow.manage.import'),
    create: t('flow.manage.create'),
    loading: t('flow.manage.loading'),
    empty: t('flow.manage.empty'),
    count: (count: number) => t('flow.manage.count', { count }),
    tableCaption: t('flow.manage.table.caption'),
    tableId: t('flow.manage.table.id'),
    tableLabel: t('flow.manage.table.label'),
    tableActions: t('flow.manage.table.actions'),
    open: t('flow.manage.open'),
    clone: t('flow.manage.clone'),
    delete: t('flow.manage.delete'),
    importModalTitle: t('flow.start.importModal.title'),
    importModalSubtitle: t('flow.start.importModal.subtitle'),
    clear: t('flow.start.clear'),
    buildFlow: t('flow.start.buildFlow'),
    importPlaceholder: '{"id":"my-flow","state":{},"pipeline":[]}',
    importError: (error: string) => t('flow.start.importError', { error }),
    loadError: t('flow.manage.error.load'),
    openError: t('flow.manage.error.open'),
    cloneError: t('flow.manage.error.clone'),
    deleteError: t('flow.manage.error.delete'),
    invalidJsonError: t('flow.start.error.invalidJson'),
    deleted: (id: string) => t('flow.manage.deleted', { id }),
  }
}

function buildSummary(
  isLoading: boolean,
  loadError: string | null,
  workflowsCount: number,
  labels: FlowBuilderManageLabels,
): string {
  if (isLoading) return labels.loading
  if (loadError) return loadError
  if (workflowsCount === 0) return labels.empty
  return labels.count(workflowsCount)
}

export function useFlowBuilderManageSelectors(
  state: FlowBuilderManageState,
  t: TranslateFn,
): FlowBuilderManageViewData {
  const labels = useMemo<FlowBuilderManageLabels>(() => buildLabels(t), [t])

  const summary = useMemo(
    () => buildSummary(state.isLoading, state.loadError, state.workflows.length, labels),
    [state.isLoading, state.loadError, state.workflows.length, labels],
  )

  const workflowRows = useMemo<FlowBuilderManageWorkflowViewModel[]>(
    () =>
      state.workflows.map((workflow) => ({
        ...workflow,
        isBusy: state.busyId === workflow.id,
      })),
    [state.busyId, state.workflows],
  )

  return useMemo<FlowBuilderManageViewData>(
    () => ({
      labels,
      summary,
      workflows: workflowRows,
      hasWorkflows: workflowRows.length > 0,
      emptyStateText: state.isLoading ? labels.loading : labels.empty,
      isImportOpen: state.isImportOpen,
      importRaw: state.importRaw,
      importErrorMessage: state.importError ? labels.importError(state.importError) : null,
    }),
    [
      labels,
      summary,
      workflowRows,
      state.isLoading,
      state.isImportOpen,
      state.importRaw,
      state.importError,
    ],
  )
}
