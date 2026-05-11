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
  FlowBuilderCatalogWorkflowViewModel,
  FlowBuilderStartScreenLabels,
  FlowBuilderStartScreenState,
  FlowBuilderStartScreenViewData,
} from '../state/FlowBuilderStartScreen.types'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export function buildLabels(t: TranslateFn): FlowBuilderStartScreenLabels {
  return {
    createNewTitle: t('flow.start.createNew.title'),
    createNewHint: t('flow.start.createNew.hint'),
    createNewAction: t('flow.start.createNew.action'),
    importTitle: t('flow.start.import.title'),
    importHint: t('flow.start.import.hint'),
    importAction: t('flow.start.import.action'),
    existingTitle: t('flow.start.existing.title'),
    existingLoading: t('flow.start.existing.loading'),
    existingEmpty: t('flow.start.existing.empty'),
    existingAvailable: (count: number) => t('flow.start.existing.available', { count }),
    existingOpening: t('flow.start.existing.opening'),
    importModalTitle: t('flow.start.importModal.title'),
    importModalSubtitle: t('flow.start.importModal.subtitle'),
    clear: t('flow.start.clear'),
    buildFlow: t('flow.start.buildFlow'),
    importPlaceholder: '{"id":"my-flow","state":{},"pipeline":[]}',
    importError: (error: string) => t('flow.start.importError', { error }),
    loadExistingError: t('flow.start.error.loadExisting'),
    invalidJsonError: t('flow.start.error.invalidJson'),
    openSelectedError: t('flow.start.error.openSelected'),
  }
}

function buildExistingHint(
  isLoading: boolean,
  error: string | null,
  workflowsCount: number,
  labels: FlowBuilderStartScreenLabels,
): string {
  if (isLoading) return labels.existingLoading
  if (error) return error
  if (workflowsCount === 0) return labels.existingEmpty
  return labels.existingAvailable(workflowsCount)
}

export function useFlowBuilderStartScreenSelectors(
  state: FlowBuilderStartScreenState,
  t: TranslateFn,
): FlowBuilderStartScreenViewData {
  const labels = useMemo<FlowBuilderStartScreenLabels>(() => buildLabels(t), [t])

  const existingHint = useMemo(
    () => buildExistingHint(state.isLoadingExisting, state.existingError, state.workflows.length, labels),
    [state.isLoadingExisting, state.existingError, state.workflows.length, labels],
  )

  const workflowRows = useMemo<FlowBuilderCatalogWorkflowViewModel[]>(
    () =>
      state.workflows.map((workflow) => ({
        ...workflow,
        isBusy: state.openingCatalogFlowId === workflow.id,
      })),
    [state.openingCatalogFlowId, state.workflows],
  )

  return useMemo<FlowBuilderStartScreenViewData>(
    () => ({
      labels,
      existingHint,
      workflows: workflowRows,
      isCatalogBusy: state.openingCatalogFlowId !== null,
      isImportOpen: state.isImportOpen,
      importRaw: state.importRaw,
      importErrorMessage: state.importError ? labels.importError(state.importError) : null,
      catalogOpenError: state.catalogOpenError,
    }),
    [
      labels,
      existingHint,
      workflowRows,
      state.openingCatalogFlowId,
      state.isImportOpen,
      state.importRaw,
      state.importError,
      state.catalogOpenError,
    ],
  )
}
