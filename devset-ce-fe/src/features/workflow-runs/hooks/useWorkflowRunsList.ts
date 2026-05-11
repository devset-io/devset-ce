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
import { listWorkflowRuns, type WorkflowRunStatusResponse } from '../services/workflow-run-execution.service'

type UseWorkflowRunsListOptions = {
  enabled: boolean
  pollIntervalMs?: number
}

type UseWorkflowRunsListResult = {
  activeRuns: WorkflowRunStatusResponse[]
  completedRuns: WorkflowRunStatusResponse[]
  isLoading: boolean
  error: string | null
  refreshRuns: () => Promise<void>
}

/** Fetches and manages the list of workflow runs for a given workflow. */
export function useWorkflowRunsList({
  enabled,
  pollIntervalMs = 5000,
}: UseWorkflowRunsListOptions): UseWorkflowRunsListResult {
  const { t } = useI18n()
  const [activeRuns, setActiveRuns] = useState<WorkflowRunStatusResponse[]>([])
  const [completedRuns, setCompletedRuns] = useState<WorkflowRunStatusResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshRunsWithSignal = useCallback(async (signal: AbortSignal, silent: boolean) => {
    if (!silent) {
      setIsLoading(true)
      setError(null)
    }
    try {
      const runs = await listWorkflowRuns(signal)
      setActiveRuns(runs.active)
      setCompletedRuns(runs.completed)
    } catch (nextError) {
      if (!signal.aborted) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : t('runs.error.loadRuns'),
        )
      }
    } finally {
      if (!signal.aborted && !silent) {
        setIsLoading(false)
      }
    }
  }, [t])

  const refreshRuns = useCallback(async () => {
    const controller = new AbortController()
    await refreshRunsWithSignal(controller.signal, false)
  }, [refreshRunsWithSignal])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const controller = new AbortController()
    void refreshRunsWithSignal(controller.signal, false)
    const timer = window.setInterval(() => {
      if (document.hidden) {
        return
      }
      void refreshRunsWithSignal(controller.signal, true)
    }, pollIntervalMs)
    return () => {
      window.clearInterval(timer)
      controller.abort()
    }
  }, [enabled, pollIntervalMs, refreshRunsWithSignal])

  return {
    activeRuns,
    completedRuns,
    isLoading,
    error,
    refreshRuns,
  }
}
