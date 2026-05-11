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

import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

/**
 * Manages asynchronous submission, stop and cleanup of execution plan runs.
 * <p>
 * Validates limits, creates the run and delegates actual task execution to
 * {@link ExecutionTaskRunner}. Each run is executed on virtual threads to avoid
 * blocking platform threads during long-lived workflow waits.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public final class ExecutionAsyncService {

    private static final ThreadFactory WORKFLOW_THREAD_FACTORY = Thread.ofVirtual().name("workflow-run-", 0).factory();

    private final ExecutionTaskRunner taskRunner;
    private final ExecutionPlanRunService runService;
    private final ExecutionPlanRunEventService runEventService;
    private final RunLifecycleService runLifecycleService;
    private final ExecutionAsyncProperties properties;
    private final ExecutorService executorService = Executors.newThreadPerTaskExecutor(WORKFLOW_THREAD_FACTORY);

    /**
     * Validates limits, creates a new run and submits it for asynchronous execution.
     *
     * @param input      the execution plan input containing the workflow definition and connectors
     * @param executions the number of individual executions to perform within this run
     * @return the unique identifier assigned to the newly created run
     * @throws WorkflowEngineException if {@code executions} is out of the allowed range
     *                                 or the maximum number of active runs has been reached
     */
    public String submit(ExecutionPlanInput input, int executions) {
        validateExecutionCount(executions);
        validateActiveRunLimit();

        String runId = UUID.randomUUID().toString();
        RunRuntime runRuntime = runService.savePendingRun(runId, executions, input.connectors());
        runEventService.initializeRun(runId);

        // FLOW: submission → ExecutionTaskRunner handles task orchestration
        executorService.submit(() -> taskRunner.run(runId, input, executions, runRuntime, executorService));
        return runId;
    }

    /**
     * Requests a graceful stop of the specified run.
     * <p>
     * If the run is already in a terminal state the current snapshot is returned unchanged.
     * Otherwise the run is marked as stopping and all in-flight execution tasks are cancelled.
     *
     * @param runId the identifier of the run to stop
     * @return the updated status snapshot after the stop request has been applied
     * @throws WorkflowEngineException if no run with the given identifier exists
     */
    public ExecutionPlanRunStatusSnapshot stopRun(String runId) {
        evictExpiredRuns();
        ExecutionPlanRunStatusSnapshot snapshot = runService.getRun(runId);
        if (snapshot == null) {
            throw new WorkflowEngineException("Workflow run not found: " + runId);
        }
        if (runLifecycleService.isTerminal(snapshot.status())) {
            return snapshot;
        }

        RunRuntime runRuntime = runService.getRunRuntime(runId);
        if (runRuntime != null) {
            runRuntime.requestStopAndCancel();
        }

        runLifecycleService.markStopRequested(runId, snapshot, runRuntime);
        ExecutionPlanRunStatusSnapshot updatedSnapshot = runService.getRun(runId);
        if (updatedSnapshot == null) {
            throw new WorkflowEngineException("Workflow run not found: " + runId);
        }
        return updatedSnapshot;
    }

    /**
     * Removes runs whose retention window has expired from both the run repository
     * and the event repository.
     */
    void evictExpiredRuns() {
        List<String> evictedRunIds = runService.evictExpiredRuns(Instant.now());
        runEventService.removeRuns(evictedRunIds);
    }

    /**
     * Shuts down the virtual-thread executor, interrupting any running tasks.
     * Invoked automatically by Spring on application context close.
     */
    @PreDestroy
    void shutdown() {
        executorService.shutdownNow();
    }

    private void validateExecutionCount(int executions) {
        int maxExecutionsPerRun = properties.getMaxExecutionsPerRun();
        if (executions <= 0) {
            throw new WorkflowEngineException("executions must be > 0");
        }
        if (executions > maxExecutionsPerRun) {
            throw new WorkflowEngineException("executions must be <= " + maxExecutionsPerRun);
        }
    }

    private void validateActiveRunLimit() {
        int maxActiveRuns = properties.getMaxActiveRuns();
        int activeRuns = runService.getActiveRuns().size();
        if (activeRuns >= maxActiveRuns) {
            throw new WorkflowEngineException("Too many active workflow runs. Max active runs is " + maxActiveRuns);
        }
    }
}
