/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ExistingWorkflowOption } from '../../../types/flowBuilder.types'

export type FlowBuilderManageLabels = {
  title: string
  subtitle: string
  import: string
  create: string
  loading: string
  empty: string
  count: (count: number) => string
  tableCaption: string
  tableId: string
  tableLabel: string
  tableActions: string
  open: string
  clone: string
  delete: string
  importModalTitle: string
  importModalSubtitle: string
  clear: string
  buildFlow: string
  importPlaceholder: string
  importError: (error: string) => string
  loadError: string
  openError: string
  cloneError: string
  deleteError: string
  invalidJsonError: string
  deleted: (id: string) => string
}

export type FlowBuilderManageWorkflowViewModel = ExistingWorkflowOption & {
  isBusy: boolean
}

export interface FlowBuilderManageState {
  workflows: ExistingWorkflowOption[]
  isLoading: boolean
  loadError: string | null
  busyId: string | null
  isImportOpen: boolean
  importRaw: string
  importError: string | null
}

export type FlowBuilderManageAction =
  | { type: 'init' }
  | { type: 'loadSuccess'; workflows: ExistingWorkflowOption[] }
  | { type: 'loadFailed'; error: string }
  | { type: 'createNew' }
  | { type: 'openImport' }
  | { type: 'closeImport' }
  | { type: 'importRawChanged'; value: string }
  | { type: 'clearImport' }
  | { type: 'applyImport' }
  | { type: 'applyImportFailed'; error: string }
  | { type: 'openWorkflow'; workflowId: string }
  | { type: 'cloneWorkflow'; workflowId: string }
  | { type: 'deleteWorkflow'; workflowId: string }
  | { type: 'workflowActionFinished' }
  | { type: 'deleteWorkflowSucceeded' }

export interface FlowBuilderManageViewData {
  labels: FlowBuilderManageLabels
  summary: string
  workflows: FlowBuilderManageWorkflowViewModel[]
  hasWorkflows: boolean
  emptyStateText: string
  isImportOpen: boolean
  importRaw: string
  importErrorMessage: string | null
}
