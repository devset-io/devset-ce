/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider'
import {
  getWorkflowRunEvents,
  getWorkflowRunStatus,
  type RunEventsResponse,
} from '../services/workflow-run-execution.service'

type RunStatus = 'idle' | 'running' | 'stopping' | 'stopped' | 'completed' | 'failed'

type UseRunEventsFeedOptions = {
  currentRunId: string | null
  runStatus: RunStatus
  onStatusFromEvents: (status: string) => void
}

const mergeRunEvents = (current: RunEventsResponse | null, incoming: RunEventsResponse): RunEventsResponse => {
  if (!current || current.runId !== incoming.runId) {
    return incoming
  }

  const mergeEvents = (
    previousEvents: RunEventsResponse['executions'][number]['events'],
    incomingEvents: RunEventsResponse['executions'][number]['events'],
  ) => {
    if (incomingEvents.length <= previousEvents.length) {
      return previousEvents
    }
    return [...previousEvents, ...incomingEvents.slice(previousEvents.length)]
  }

  const previousByExecution = new Map(current.executions.map((execution) => [execution.executionIndex, execution]))
  const mergedExecutions = incoming.executions.map((incomingExecution) => {
    const previousExecution = previousByExecution.get(incomingExecution.executionIndex)
    if (!previousExecution) {
      return incomingExecution
    }

    return {
      ...incomingExecution,
      eventCount: Math.max(incomingExecution.eventCount, previousExecution.eventCount),
      events: mergeEvents(previousExecution.events, incomingExecution.events),
    }
  })

  return {
    ...incoming,
    executionCount: mergedExecutions.length,
    executions: mergedExecutions,
  }
}

/** Subscribes to run execution events via SSE and manages the event list. */
export function useRunEventsFeed({ currentRunId, runStatus, onStatusFromEvents }: UseRunEventsFeedOptions) {
  const { t } = useI18n()
  const [runEvents, setRunEvents] = useState<RunEventsResponse | null>(null)
  const [selectedExecutionIndex, setSelectedExecutionIndex] = useState<number | null>(null)
  const [runEventsLoading, setRunEventsLoading] = useState(false)
  const [runEventsError, setRunEventsError] = useState<string | null>(null)

  const refreshRunEvents = useCallback(
    async (runId: string, signal: AbortSignal, silent = false) => {
      if (!silent) {
        setRunEventsLoading(true)
        setRunEventsError(null)
      }
      try {
        const [eventsResponse, statusSnapshot] = await Promise.all([
          getWorkflowRunEvents(runId, signal),
          getWorkflowRunStatus(runId, signal),
        ])
        onStatusFromEvents(statusSnapshot.status)
        setRunEvents((current) => mergeRunEvents(current, eventsResponse))
        setSelectedExecutionIndex((current) => {
          if (eventsResponse.executions.length === 0) {
            return null
          }
          if (current && eventsResponse.executions.some((execution) => execution.executionIndex === current)) {
            return current
          }
          return eventsResponse.executions[0]?.executionIndex ?? null
        })
      } catch (nextError) {
        if (!signal.aborted) {
          setRunEventsError(
            nextError instanceof Error
              ? nextError.message
              : t('runs.error.loadRunEvents'),
          )
        }
      } finally {
        if (!signal.aborted && !silent) {
          setRunEventsLoading(false)
        }
      }
    },
    [onStatusFromEvents, t],
  )

  useEffect(() => {
    if (!currentRunId) {
      setRunEvents(null)
      setSelectedExecutionIndex(null)
      setRunEventsError(null)
      return
    }
    const controller = new AbortController()
    void refreshRunEvents(currentRunId, controller.signal, false)
    const shouldPollEvents = runStatus === 'running' || runStatus === 'stopping'
    const timer = shouldPollEvents
      ? window.setInterval(() => {
          void refreshRunEvents(currentRunId, controller.signal, true)
        }, 4000)
      : null
    return () => {
      if (timer !== null) {
        window.clearInterval(timer)
      }
      controller.abort()
    }
  }, [currentRunId, refreshRunEvents, runStatus])

  return {
    runEvents,
    selectedExecutionIndex,
    runEventsLoading,
    runEventsError,
    setSelectedExecutionIndex,
    refreshRunEvents,
  }
}
