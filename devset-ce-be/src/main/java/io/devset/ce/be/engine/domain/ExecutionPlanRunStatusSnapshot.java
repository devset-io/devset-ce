/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.domain;

/**
 * Immutable snapshot of a run's progress and outcome counters.
 * <p>
 * Returned by the execution plan facade to expose run status to controllers and
 * external observers without exposing the internal run state.
 *
 * @param runId                run identifier
 * @param status               current lifecycle status
 * @param requestedExecutions  total executions requested when the run was submitted
 * @param submittedExecutions  executions scheduled on the engine so far
 * @param completedExecutions  executions that finished successfully
 * @param failedExecutions     executions that terminated with an error
 * @param errorMessage         error message if the run failed; {@code null} otherwise
 */
public record ExecutionPlanRunStatusSnapshot(
        String runId,
        ExecutionPlanRunStatus status,
        int requestedExecutions,
        int submittedExecutions,
        int completedExecutions,
        int failedExecutions,
        String errorMessage
) {}
