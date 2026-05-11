/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.api.dto;

/**
 * API DTO returned when fetching the status of a run.
 *
 * @param runId               run identifier
 * @param status              textual run status
 * @param active              {@code true} if the run is in an active (non-terminal) state
 * @param requestedExecutions number of requested executions
 * @param submittedExecutions number of submitted executions
 * @param completedExecutions number of successfully completed executions
 * @param failedExecutions    number of failed executions
 * @param errorMessage        error message if the run failed; {@code null} otherwise
 */
public record ExecutionPlanRunStatusResponseDto(
        String runId,
        String status,
        boolean active,
        int requestedExecutions,
        int submittedExecutions,
        int completedExecutions,
        int failedExecutions,
        String errorMessage
) {}
