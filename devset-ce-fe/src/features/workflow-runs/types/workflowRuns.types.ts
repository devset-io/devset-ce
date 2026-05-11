/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ConnectorStatus } from '../../../shared/services/kafka-connectors.service'
import type { DslPayload, ExistingWorkflowOption, LoadedSchema } from '../../flow-builder/types'
import type { RunEventsResponse, WorkflowRunStatusResponse } from '../services/workflow-run-execution.service'

export type { ConnectorStatus, DslPayload, ExistingWorkflowOption, LoadedSchema, RunEventsResponse, WorkflowRunStatusResponse }

export type RunStatus = 'idle' | 'running' | 'stopping' | 'stopped' | 'completed' | 'failed'
