/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DslPayload } from '../../flow-builder/types'
import type { ExecutionPlanRunEventsResponse } from '../types/playground.types'
import {
  normalizeExecutionPlanRunEventsResponse,
} from '../../../shared/services/execution-plan-events.service'
import { fetchApi } from '../../../shared/services/http-api.service'

export const previewWorkflowPlayground = async (
  payload: DslPayload,
  signal?: AbortSignal,
): Promise<ExecutionPlanRunEventsResponse> => {
  const response = await fetchApi('/engine/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  const raw = (await response.json()) as unknown // SAFETY: intentionally cast to unknown for subsequent validation
  return normalizeExecutionPlanRunEventsResponse(raw, 'SIMULATION')
}
