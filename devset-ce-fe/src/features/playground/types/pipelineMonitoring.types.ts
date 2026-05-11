/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ExecutionPlanEvent } from './playground.types'

export type PipelineStage = {
  stageIndex: number
  stageName: string
  producedEvents: ExecutionPlanEvent[]
  outputEventsAfterStage?: ExecutionPlanEvent[]
}

export type PipelineMonitoringData = {
  compiled?: boolean
  pipeline: PipelineStage[]
  outputEvents: ExecutionPlanEvent[]
}

export type EventSearchScope = 'payload' | 'header' | 'both'

export type StageSelection = number | 'final'

export type PipelineMonitoringLabels = {
  title: string
  empty: string
  compiled: string
  notCompiled: string
  eventSearchPlaceholder: string
  backToBuilder: string | null
  stage: string
  events: string
  result: string
  finalResult: string
  eventLogTitle: string
  searchScopeLabel: string
  searchScopeBoth: string
  searchScopePayload: string
  searchScopeHeader: string
  detailsTitle: string
  range: string
  rangeFinal: string
  rangeProduced: string
  stageLabel: string
  stageFinal: string
  eventLabel: string
  headerJson: string
  payloadJson: string
  copy: string
}

export type PipelineSearchScopeOption = {
  value: EventSearchScope
  label: string
}

export type PipelineStageItemViewModel = {
  key: string
  selection: StageSelection
  eyebrow: string
  title: string
  meta: string
  isActive: boolean
}

export type PipelineEventItemViewModel = {
  key: string
  index: number
  indexLabel: string
  preview: string
  isActive: boolean
}

export type PipelineEventDetailsViewModel = {
  title: string
  hasActiveEvent: boolean
  emptyText: string
  rangeLabel: string
  rangeValue: string
  stageLabel: string
  stageValue: string
  eventLabel: string
  eventValue: string
  headerTitle: string
  headerJsonText: string
  payloadTitle: string
  payloadText: string
  copyLabel: string
}

export type PipelineMonitoringViewModel = {
  title: string
  subtitle: string
  compiledBadgeLabel: string | null
  isCompiled: boolean | null
  backToBuilderLabel: string | null
  stageItems: PipelineStageItemViewModel[]
  eventLogTitle: string
  eventSearch: string
  eventSearchPlaceholder: string
  eventSearchScope: EventSearchScope
  eventSearchScopeLabel: string
  eventSearchScopeOptions: PipelineSearchScopeOption[]
  eventItems: PipelineEventItemViewModel[]
  emptyText: string
  details: PipelineEventDetailsViewModel
  onSelectStage: (selection: StageSelection) => void
  onSelectEvent: (index: number) => void
  onEventSearchChange: (value: string) => void
  onEventSearchScopeChange: (scope: EventSearchScope) => void
  onBackToBuilder: () => void
}

export type PipelineStageStripProps = {
  items: PipelineStageItemViewModel[]
  onSelectStage: (selection: StageSelection) => void
}

export type PipelineEventLogProps = {
  title: string
  items: PipelineEventItemViewModel[]
  eventSearch: string
  eventSearchScope: EventSearchScope
  eventSearchScopeLabel: string
  eventSearchScopeOptions: PipelineSearchScopeOption[]
  eventSearchPlaceholder: string
  emptyText: string
  onEventSearchChange: (value: string) => void
  onEventSearchScopeChange: (scope: EventSearchScope) => void
  onSelectEvent: (index: number) => void
}

export type PipelineEventDetailsProps = {
  details: PipelineEventDetailsViewModel
}
