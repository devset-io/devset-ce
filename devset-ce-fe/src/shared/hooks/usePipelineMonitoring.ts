/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// usePipelineMonitoring — SHARED hook
//
// This hook is used by BOTH the Playground feature and the
// Workflow Runs feature. It lives in shared/ because it is
// part of the public API exported from playground/index.ts.
//
// It takes pipeline monitoring data (grouped events by stage)
// and returns a fully built PipelineMonitoringViewModel with
// all the derived state and callbacks the UI components need.
//
// The Playground page does NOT use this hook directly — it
// inlines the same logic in its own selectors file. But the
// Workflow Runs feature imports it via playground/index.ts.
// ──────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type {
  EventSearchScope,
  PipelineMonitoringData,
  PipelineMonitoringLabels,
  PipelineMonitoringViewModel,
  StageSelection,
} from '../../features/playground/types/pipelineMonitoring.types'
import { collectSearchableValues, compactPreview, formatJson } from '../../features/playground/shared/pipelineMonitoring.utils'

// ──────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────

const clampIndex = (index: number, length: number): number => {
  if (length <= 0) {
    return 0
  }
  if (index < 0) {
    return 0
  }
  if (index >= length) {
    return length - 1
  }
  return index
}

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type UsePipelineMonitoringOptions = {
  data: PipelineMonitoringData | null
  labels: PipelineMonitoringLabels
  subtitle: string
  onBackToBuilder: () => void
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

/** Connects to SSE pipeline events and dispatches state updates. */
export function usePipelineMonitoring({
  data,
  labels,
  subtitle,
  onBackToBuilder,
}: UsePipelineMonitoringOptions): PipelineMonitoringViewModel | null {
  const [activeStageSelection, setActiveStageSelection] = useState<StageSelection>(0)
  const [activeEventIndex, setActiveEventIndex] = useState(0)
  const [eventSearch, setEventSearchState] = useState('')
  const [eventSearchScope, setEventSearchScopeState] = useState<EventSearchScope>('both')

  const pipelineLength = data?.pipeline.length ?? 0

  const normalizedStageSelection = useMemo<StageSelection>(() => {
    if (activeStageSelection === 'final') {
      return 'final'
    }
    if (pipelineLength <= 0) {
      return 0
    }
    return clampIndex(activeStageSelection, pipelineLength)
  }, [activeStageSelection, pipelineLength])

  const activeStage =
    !data || normalizedStageSelection === 'final'
      ? null
      : data.pipeline[normalizedStageSelection] ?? data.pipeline[0] ?? null

  const visibleEvents = useMemo(() => {
    if (!data) {
      return []
    }
    if (normalizedStageSelection === 'final') {
      return data.outputEvents
    }
    return activeStage?.producedEvents ?? []
  }, [activeStage, data, normalizedStageSelection])

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase()
    if (!query) {
      return visibleEvents
    }

    return visibleEvents.filter((event) => {
      const payloadRaw = collectSearchableValues(event.payload).join(' ').toLowerCase()
      const headerRaw = collectSearchableValues(event.header).join(' ').toLowerCase()
      if (eventSearchScope === 'payload') {
        return payloadRaw.includes(query)
      }
      if (eventSearchScope === 'header') {
        return headerRaw.includes(query)
      }
      return payloadRaw.includes(query) || headerRaw.includes(query)
    })
  }, [eventSearch, eventSearchScope, visibleEvents])

  const safeActiveEventIndex = clampIndex(activeEventIndex, filteredEvents.length)
  const activeEvent = filteredEvents[safeActiveEventIndex] ?? null
  const payloadText = useMemo(() => (activeEvent ? formatJson(activeEvent.payload) : ''), [activeEvent])

  const selectStage = (selection: StageSelection) => {
    setActiveStageSelection(selection)
    setActiveEventIndex(0)
  }

  const selectEvent = (index: number) => {
    setActiveEventIndex(index)
  }

  const setEventSearch = (value: string) => {
    setEventSearchState(value)
    setActiveEventIndex(0)
  }

  const setEventSearchScope = (scope: EventSearchScope) => {
    setEventSearchScopeState(scope)
    setActiveEventIndex(0)
  }

  if (!data) {
    return null
  }

  return {
    title: labels.title,
    subtitle,
    compiledBadgeLabel:
      typeof data.compiled === 'boolean' ? (data.compiled ? labels.compiled : labels.notCompiled) : null,
    isCompiled: typeof data.compiled === 'boolean' ? data.compiled : null,
    backToBuilderLabel: labels.backToBuilder,
    stageItems: [
      ...data.pipeline.map((stage, index) => ({
        key: `${stage.stageIndex}-${stage.stageName}`,
        selection: index as StageSelection, // SAFETY: index is a number from valid pipeline stage indices, which StageSelection accepts
        eyebrow: `${labels.stage} ${index + 1}`,
        title: stage.stageName,
        meta: `${labels.events}: ${stage.producedEvents.length}`,
        isActive: normalizedStageSelection === index,
      })),
      {
        key: 'final-result',
        selection: 'final' as StageSelection, // SAFETY: 'final' is a valid StageSelection literal member
        eyebrow: labels.result,
        title: labels.finalResult,
        meta: `${labels.events}: ${data.outputEvents.length}`,
        isActive: normalizedStageSelection === 'final',
      },
    ],
    eventLogTitle: labels.eventLogTitle,
    eventSearch,
    eventSearchPlaceholder: labels.eventSearchPlaceholder,
    eventSearchScope,
    eventSearchScopeLabel: labels.searchScopeLabel,
    eventSearchScopeOptions: [
      { value: 'both', label: labels.searchScopeBoth },
      { value: 'payload', label: labels.searchScopePayload },
      { value: 'header', label: labels.searchScopeHeader },
    ],
    eventItems: filteredEvents.map((event, index) => ({
      key: `event-${index}`,
      index,
      indexLabel: `#${index + 1}`,
      preview: compactPreview(event.payload),
      isActive: index === safeActiveEventIndex,
    })),
    emptyText: labels.empty,
    details: {
      title: labels.detailsTitle,
      hasActiveEvent: activeEvent !== null,
      emptyText: labels.empty,
      rangeLabel: labels.range,
      rangeValue: normalizedStageSelection === 'final' ? labels.rangeFinal : labels.rangeProduced,
      stageLabel: labels.stageLabel,
      stageValue: activeStage?.stageName ?? labels.stageFinal,
      eventLabel: labels.eventLabel,
      eventValue: `#${safeActiveEventIndex + 1}`,
      headerTitle: labels.headerJson,
      headerJsonText: activeEvent ? formatJson(activeEvent.header) : '',
      payloadTitle: labels.payloadJson,
      payloadText,
      copyLabel: labels.copy,
    },
    onSelectStage: selectStage,
    onSelectEvent: selectEvent,
    onEventSearchChange: setEventSearch,
    onEventSearchScopeChange: setEventSearchScope,
    onBackToBuilder,
  }
}
