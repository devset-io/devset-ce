/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type {
  ExecutionEventsDto,
  ExecutionPlanEvent,
  ExecutionPlanRunEventsResponse,
} from '../types/execution-plan-events'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const normalizeExecutionPlanStatus = (
  value: unknown,
): ExecutionPlanRunEventsResponse['status'] => {
  const normalized = typeof value === 'string' ? value.toUpperCase() : 'FAILED'
  return normalized === 'PENDING' ||
    normalized === 'RUNNING' ||
    normalized === 'STOPPING' ||
    normalized === 'STOPPED' ||
    normalized === 'FAILED' ||
    normalized === 'COMPLETED'
    ? normalized
    : 'FAILED'
}

export const normalizeExecutionPlanEvent = (eventRaw: unknown): ExecutionPlanEvent => {
  if (!isRecord(eventRaw)) {
    return { header: {}, payload: {}, stageName: null }
  }

  return {
    header: isRecord(eventRaw.header) ? eventRaw.header : {},
    payload: isRecord(eventRaw.payload) ? eventRaw.payload : {},
    stageName: typeof eventRaw.stageName === 'string' ? eventRaw.stageName : null,
  }
}

export const normalizeExecutionEventsDto = (
  executionRaw: unknown,
  index: number,
): ExecutionEventsDto => {
  if (!isRecord(executionRaw)) {
    return {
      executionIndex: index + 1,
      eventCount: 0,
      events: [],
    }
  }

  const eventsRaw = Array.isArray(executionRaw.events) ? executionRaw.events : []
  const events = eventsRaw.map((eventRaw) => normalizeExecutionPlanEvent(eventRaw))
  return {
    executionIndex: typeof executionRaw.executionIndex === 'number' ? executionRaw.executionIndex : index + 1,
    eventCount: typeof executionRaw.eventCount === 'number' ? executionRaw.eventCount : events.length,
    events,
  }
}

export const normalizeExecutionPlanRunEventsResponse = (
  payload: unknown,
  fallbackRunId: string,
): ExecutionPlanRunEventsResponse => {
  if (!isRecord(payload) || !Array.isArray(payload.executions)) {
    throw new Error('Invalid execution events response format')
  }

  const executions = payload.executions.map((executionRaw, index) =>
    normalizeExecutionEventsDto(executionRaw, index),
  )

  return {
    runId:
      typeof payload.runId === 'string' && payload.runId.trim().length > 0
        ? payload.runId
        : fallbackRunId,
    status: normalizeExecutionPlanStatus(payload.status),
    executionCount:
      typeof payload.executionCount === 'number'
        ? payload.executionCount
        : executions.length,
    executions,
  }
}

export const groupExecutionEventsByStage = (events: ExecutionPlanEvent[]) => {
  const byStage = new Map<
    string,
    {
      stageIndex: number
      stageName: string
      producedEvents: ExecutionPlanEvent[]
      outputEventsAfterStage: ExecutionPlanEvent[]
    }
  >()
  let stageCounter = 0
  const cumulative: ExecutionPlanEvent[] = []

  events.forEach((event) => {
    const stageName = event.stageName?.trim() ? event.stageName : 'unknown-stage'
    if (!byStage.has(stageName)) {
      stageCounter += 1
      byStage.set(stageName, {
        stageIndex: stageCounter,
        stageName,
        producedEvents: [],
        outputEventsAfterStage: [],
      })
    }
    const stage = byStage.get(stageName)
    if (!stage) {
      return
    }
    stage.producedEvents.push(event)
    cumulative.push(event)
    stage.outputEventsAfterStage = [...cumulative]
  })

  return {
    pipeline: Array.from(byStage.values()),
    outputEvents: events,
  }
}
