/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ExistingWorkflowOption, PlaygroundSourceMode } from './playground.types'
import type { PipelineMonitoringLabels, PipelineMonitoringViewModel } from './pipelineMonitoring.types'

export type PlaygroundLabels = {
  sourceMode: string
  sourceModeWorkflow: string
  sourceModeJson: string
  workflowSelect: string
  workflowEmpty: string
  openJsonModal: string
  previewing: string
  preview: string
  originFlowBuilder: string
  originFlowBuilderWithId: string
  backToBuilder: string
  jsonModalTitle: string
  jsonModalSubtitle: string
  clearJson: string
  saveJson: string
  errors: {
    loadCatalog: string
    requestFailed: string
    invalidJson: string
  }
  monitoring: PipelineMonitoringLabels
}

export type PlaygroundProps = {
  labels: Omit<PlaygroundLabels, 'errors' | 'monitoring' | 'backToBuilder'>
  sourceMode: PlaygroundSourceMode
  workflows: ExistingWorkflowOption[]
  selectedWorkflowId: string
  isLoadingWorkflows: boolean
  isPreviewLoading: boolean
  error: string | null
  originNote: string | null
  isJsonModalOpen: boolean
  customDslDraft: string
  canPreview: boolean
  monitoring: PipelineMonitoringViewModel | null
  onSourceModeChange: (mode: PlaygroundSourceMode) => void
  onSelectedWorkflowIdChange: (workflowId: string) => void
  onOpenJsonModal: () => void
  onCloseJsonModal: () => void
  onCustomDslDraftChange: (value: string) => void
  onResetJsonDraft: () => void
  onSaveJsonDraft: () => void
  onPreview: () => void
}
