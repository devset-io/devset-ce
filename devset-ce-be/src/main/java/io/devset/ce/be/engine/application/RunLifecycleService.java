/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Manages execution plan run status transitions throughout a run's lifecycle.
 * <p>
 * Encapsulates the rules for moving a run between intermediate states
 * ({@code RUNNING}, {@code STOPPING}) and terminal states ({@code COMPLETED},
 * {@code FAILED}, {@code STOPPED}). Terminal runs are stamped with a retention
 * expiry so the repository can evict them later.
 */
@Component
@RequiredArgsConstructor
public final class RunLifecycleService {

    private static final Duration COMPLETED_RUN_RETENTION = Duration.ofHours(1);
    private static final String STOP_REQUESTED_MESSAGE = "Stop requested by user";
    private static final String STOPPED_MESSAGE = "Stopped by user";

    private final ExecutionPlanRunService runService;

    /**
     * Checks whether the given status represents a terminal (final) state.
     *
     * @param status the run status to check
     * @return {@code true} if the status is {@code COMPLETED}, {@code FAILED} or {@code STOPPED}
     */
    public boolean isTerminal(ExecutionPlanRunStatus status) {
        return status == ExecutionPlanRunStatus.COMPLETED
                || status == ExecutionPlanRunStatus.FAILED
                || status == ExecutionPlanRunStatus.STOPPED;
    }

    /**
     * Transitions a run to {@code RUNNING} status.
     *
     * @param runId               the run identifier
     * @param requestedExecutions the total number of requested executions
     * @param runRuntime          the mutable runtime handle for the run
     */
    public void markRunning(String runId, int requestedExecutions, RunRuntime runRuntime) {
        updateFromRuntime(runId, ExecutionPlanRunStatus.RUNNING, requestedExecutions, runRuntime, null);
    }

    /**
     * Updates the run snapshot after a single execution task has been submitted.
     *
     * @param runId               the run identifier
     * @param requestedExecutions the total number of requested executions
     * @param runRuntime          the mutable runtime handle for the run
     */
    public void markExecutionSubmitted(String runId, int requestedExecutions, RunRuntime runRuntime) {
        updateFromRuntime(runId, resolveIntermediateStatus(runRuntime), requestedExecutions, runRuntime, stopRequestedMessage(runRuntime));
    }

    /**
     * Records a single execution failure and persists the associated error message.
     *
     * @param runId               the run identifier
     * @param requestedExecutions the total number of requested executions
     * @param runRuntime          the mutable runtime handle for the run
     * @param errorMessage        a human-readable description of the failure
     */
    public void markExecutionFailed(
            String runId,
            int requestedExecutions,
            RunRuntime runRuntime,
            String errorMessage
    ) {
        updateFromRuntime(runId, ExecutionPlanRunStatus.RUNNING, requestedExecutions, runRuntime, errorMessage);
    }

    /**
     * Updates the run snapshot after a single execution task has completed successfully.
     *
     * @param runId               the run identifier
     * @param requestedExecutions the total number of requested executions
     * @param runRuntime          the mutable runtime handle for the run
     */
    public void markExecutionCompleted(String runId, int requestedExecutions, RunRuntime runRuntime) {
        updateFromRuntime(runId, resolveIntermediateStatus(runRuntime), requestedExecutions, runRuntime, stopRequestedMessage(runRuntime));
    }

    /**
     * Marks a run as {@code STOPPING} in response to a user-initiated stop request.
     *
     * @param runId      the run identifier
     * @param snapshot   the current status snapshot of the run
     * @param runRuntime the mutable runtime handle, or {@code null} if the run has already finished
     */
    public void markStopRequested(
            String runId,
            ExecutionPlanRunStatusSnapshot snapshot,
            RunRuntime runRuntime
    ) {
        update(
                runId,
                ExecutionPlanRunStatus.STOPPING,
                snapshot.requestedExecutions(),
                runRuntime == null ? snapshot.submittedExecutions() : runRuntime.submittedExecutions(),
                snapshot.completedExecutions(),
                snapshot.failedExecutions(),
                STOP_REQUESTED_MESSAGE
        );
    }

    /**
     * Resolves and persists the final (terminal) status for a run based on its runtime counters.
     *
     * @param runId               the run identifier
     * @param requestedExecutions the total number of requested executions
     * @param runRuntime          the mutable runtime handle for the run
     * @return the terminal {@link ExecutionPlanRunStatus} that was applied
     */
    public ExecutionPlanRunStatus markFinal(String runId, int requestedExecutions, RunRuntime runRuntime) {
        ExecutionPlanRunStatus status = resolveFinalStatus(runRuntime);
        String message = resolveFinalMessage(status, runRuntime.firstErrorMessage());
        updateFromRuntime(runId, status, requestedExecutions, runRuntime, message);
        return status;
    }

    private String stopRequestedMessage(RunRuntime runRuntime) {
        return runRuntime.isStopRequested() ? STOP_REQUESTED_MESSAGE : null;
    }

    private ExecutionPlanRunStatus resolveIntermediateStatus(RunRuntime runRuntime) {
        return runRuntime.isStopRequested()
                ? ExecutionPlanRunStatus.STOPPING
                : ExecutionPlanRunStatus.RUNNING;
    }

    private ExecutionPlanRunStatus resolveFinalStatus(RunRuntime runRuntime) {
        if (runRuntime.isStopRequested()) {
            return ExecutionPlanRunStatus.STOPPED;
        }
        return runRuntime.failed() > 0
                ? ExecutionPlanRunStatus.FAILED
                : ExecutionPlanRunStatus.COMPLETED;
    }

    private String resolveFinalMessage(ExecutionPlanRunStatus status, String firstErrorMessage) {
        if (status == ExecutionPlanRunStatus.STOPPED) {
            return STOPPED_MESSAGE;
        }
        return firstErrorMessage;
    }

    private void updateFromRuntime(
            String runId,
            ExecutionPlanRunStatus status,
            int requestedExecutions,
            RunRuntime runRuntime,
            String errorMessage
    ) {
        update(
                runId,
                status,
                requestedExecutions,
                runRuntime.submittedExecutions(),
                runRuntime.completed(),
                runRuntime.failed(),
                errorMessage
        );
    }

    private void update(
            String runId,
            ExecutionPlanRunStatus status,
            int requestedExecutions,
            int submittedExecutions,
            int completedExecutions,
            int failedExecutions,
            String errorMessage
    ) {
        runService.updateSnapshot(
                runId,
                status,
                requestedExecutions,
                submittedExecutions,
                completedExecutions,
                failedExecutions,
                errorMessage,
                isTerminal(status) ? Instant.now().plus(COMPLETED_RUN_RETENTION) : null
        );
    }
}
