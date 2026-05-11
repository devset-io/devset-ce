/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ExistingWorkflowOption, FlowBuilderBootstrap } from '../../../types'

export type FlowBuilderStartScreenLabels = {
  createNewTitle: string
  createNewHint: string
  createNewAction: string
  importTitle: string
  importHint: string
  importAction: string
  existingTitle: string
  existingLoading: string
  existingEmpty: string
  existingAvailable: (count: number) => string
  existingOpening: string
  importModalTitle: string
  importModalSubtitle: string
  clear: string
  buildFlow: string
  importPlaceholder: string
  importError: (error: string) => string
  loadExistingError: string
  invalidJsonError: string
  openSelectedError: string
}

export type FlowBuilderCatalogWorkflowViewModel = ExistingWorkflowOption & {
  isBusy: boolean
}

export type FlowBuilderStartScreenCallbacks = {
  onStart: (bootstrap: FlowBuilderBootstrap) => void
  onCreateNew: () => void
}

export interface FlowBuilderStartScreenState {
  workflows: ExistingWorkflowOption[]
  isLoadingExisting: boolean
  existingError: string | null
  isImportOpen: boolean
  importRaw: string
  importError: string | null
  openingCatalogFlowId: string | null
  catalogOpenError: string | null
}

export type FlowBuilderStartScreenAction =
  | { type: 'init' }
  | { type: 'loadExistingSuccess'; workflows: ExistingWorkflowOption[] }
  | { type: 'loadExistingFailed'; error: string }
  | { type: 'createNew' }
  | { type: 'openImport' }
  | { type: 'closeImport' }
  | { type: 'importRawChanged'; value: string }
  | { type: 'clearImport' }
  | { type: 'applyImport' }
  | { type: 'applyImportFailed'; error: string }
  | { type: 'openSavedWorkflow'; workflowId: string }
  | { type: 'openSavedWorkflowFailed'; error: string }

export interface FlowBuilderStartScreenViewData {
  labels: FlowBuilderStartScreenLabels
  existingHint: string
  workflows: FlowBuilderCatalogWorkflowViewModel[]
  isCatalogBusy: boolean
  isImportOpen: boolean
  importRaw: string
  importErrorMessage: string | null
  catalogOpenError: string | null
}
