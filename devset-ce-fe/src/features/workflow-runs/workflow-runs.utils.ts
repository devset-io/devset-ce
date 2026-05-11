/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DslPayload } from '../flow-builder/types'
import type { RunStatus } from './types/workflowRuns.types'
import { createClientId } from '../../shared/utils/create-client-id'
import { EMPTY_KEY, parseKeyValue, serializeKeyValue } from '../../shared/types/key-value.types'
import type { KeyValue } from '../../shared/types/key-value.types'

export type HeaderRow = { id: string; key: string; value: string }

export type { KeyValueKind, KeyValue } from '../../shared/types/key-value.types'

export const RUN_STATUS_POLL_INTERVAL_MS = 3000

export const formatRunStatusLine = (
  runId: string,
  status: string,
  requestedExecutions: number,
  submittedExecutions: number,
  completedExecutions: number,
  failedExecutions: number,
  eventsCount: number,
) =>
  `runId=${runId} | status=${status} | requested=${requestedExecutions} | submitted=${submittedExecutions} | completed=${completedExecutions} | failed=${failedExecutions} | events=${eventsCount}`

export const formatRunStatusDetail = (status: string): string => {
  const normalized = status.toUpperCase()
  if (normalized === 'PENDING' || normalized === 'RUNNING') {
    return 'still processing...'
  }
  if (normalized === 'STOPPING') {
    return 'stop requested...'
  }
  if (normalized === 'STOPPED') {
    return 'stopped'
  }
  if (normalized === 'COMPLETED') {
    return 'completed'
  }
  if (normalized === 'FAILED') {
    return 'failed'
  }
  return 'status update'
}

export const stripStateFromWorkflow = (workflow: DslPayload) => ({
  id: workflow.id,
  producerName: workflow.producerName,
  topic: workflow.topic,
  executions: workflow.executions,
  pipeline: workflow.pipeline.map((stage) => {
    const next = { ...stage } as typeof stage & { state?: unknown } // SAFETY: spread preserves stage shape; adding optional state property for deletion
    delete next.state
    return next
  }),
})

export const buildWorkflowWithOverrides = (
  workflow: DslPayload,
  topicOverride: string,
  headerRowsByStageIndex: Record<number, HeaderRow[]>,
  keyByStageIndex: Record<number, KeyValue>,
): DslPayload => ({
  ...workflow,
  topic: topicOverride.trim() || workflow.topic,
  pipeline: workflow.pipeline.map((stage, index) => {
    const rows = headerRowsByStageIndex[index] ?? []
    const headers = rows.reduce<Record<string, string>>((acc, row) => {
      const key = row.key.trim()
      if (!key) {
        return acc
      }
      acc[key] = row.value
      return acc
    }, {})
    return {
      ...stage,
      headers,
      key: serializeKeyValue(keyByStageIndex[index]),
    }
  }),
})

/** Converts a backend status string to the UI RunStatus enum. */
export const toUiRunStatus = (backendStatus: string): RunStatus => {
  const normalized = backendStatus.toUpperCase()
  if (normalized === 'PENDING' || normalized === 'RUNNING') return 'running'
  if (normalized === 'STOPPING') return 'stopping'
  if (normalized === 'STOPPED') return 'stopped'
  if (normalized === 'COMPLETED') return 'completed'
  if (normalized === 'FAILED') return 'failed'
  return 'running'
}

/** Resolves a human-readable label for a run status. */
export const toRunStatusLabel = (status: RunStatus, labels: Record<RunStatus, string>): string => labels[status]

export { EMPTY_KEY }

export const mapKeysFromWorkflow = (workflow: DslPayload): Record<number, KeyValue> => {
  const keys: Record<number, KeyValue> = {}
  workflow.pipeline.forEach((stage, index) => {
    keys[index] = parseKeyValue(stage.key)
  })
  return keys
}

export const mapHeaderRowsFromWorkflow = (workflow: DslPayload): Record<number, HeaderRow[]> => {
  const nextHeaderRows: Record<number, HeaderRow[]> = {}
  workflow.pipeline.forEach((stage, index) => {
    const entries = Object.entries(stage.headers ?? {})
    nextHeaderRows[index] =
      entries.length > 0
        ? entries.map(([key, value]) => ({
            id: createClientId(),
            key,
            value: String(value),
          }))
        : [{ id: createClientId(), key: '', value: '' }]
  })
  return nextHeaderRows
}
