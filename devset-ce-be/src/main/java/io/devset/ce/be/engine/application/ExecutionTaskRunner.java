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

import io.devset.ce.be.common.util.ExceptionUtils;
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

/**
 * Orchestrates the execution of a single run: submits tasks, processes completions
 * and finalizes the run status.
 * <p>
 * Separated from {@link ExecutionAsyncService} to keep submission/lifecycle management
 * distinct from task-level orchestration and error handling.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public final class ExecutionTaskRunner {

    private final ExecutionPlanEngine workflowEngine;
    private final ExecutionPlanRunService runService;
    private final ExecutionPlanRunEventService runEventService;
    private final RunLifecycleService runLifecycleService;

    /**
     * Runs a full execution plan: marks running, submits tasks, processes results, finalizes.
     *
     * @param runId           the run identifier
     * @param input           compiled execution plan input
     * @param executions      number of individual executions to perform
     * @param runRuntime      mutable runtime handle for the run
     * @param executorService thread pool for submitting execution tasks
     */
    // FLOW: mark running → submit tasks → process completed → drain on stop → finalize
    void run(String runId, ExecutionPlanInput input, int executions, RunRuntime runRuntime, ExecutorService executorService) {
        ExecutorCompletionService<ExecutionPlanResult> completionService = new ExecutorCompletionService<>(executorService);
        try {
            runLifecycleService.markRunning(runId, executions, runRuntime);
            log.debug("Workflow processing started: runId={}, id={}, executions={}", runId, input.definition().workflowId(), executions);

            submitExecutionTasks(runId, input, executions, runRuntime, completionService);
            processCompletedTasks(runId, executions, runRuntime, completionService);
            awaitExecutionTaskDrainOnStop(runRuntime);
            finalizeRun(runId, input.definition().workflowId(), executions, runRuntime);
        } finally {
            runService.clearRunRuntime(runId);
        }
    }

    private void submitExecutionTasks(
            String runId,
            ExecutionPlanInput input,
            int executions,
            RunRuntime runRuntime,
            ExecutorCompletionService<ExecutionPlanResult> completionService
    ) {
        for (int index = 0; index < executions; index++) {
            if (runRuntime.isStopRequested()) {
                break;
            }
            int executionIndex = index + 1;
            List<ExecutionPlanEvent> executionEvents = new ArrayList<>();
            runEventService.initializeExecution(runId, executionIndex);

            Future<ExecutionPlanResult> executionTask =
                    completionService.submit(() -> {
                        runRuntime.markExecutionTaskStarted();
                        try {
                            return workflowEngine.execute(
                                    input,
                                    executionEvents,
                                    (step, stepEvents) -> runEventService.appendStepEvents(runId, executionIndex, stepEvents)
                            );
                        } finally {
                            runRuntime.markExecutionTaskFinished();
                        }
                    });
            runRuntime.addExecutionTask(executionTask);
            runRuntime.incrementSubmittedExecutions();
            runLifecycleService.markExecutionSubmitted(runId, executions, runRuntime);
        }
    }

    private void processCompletedTasks(
            String runId,
            int executions,
            RunRuntime runRuntime,
            ExecutorCompletionService<ExecutionPlanResult> completionService
    ) {
        int submittedExecutions = runRuntime.submittedExecutions();
        for (int processed = 0; processed < submittedExecutions; processed++) {
            Future<ExecutionPlanResult> doneTask = awaitCompletedTask(runRuntime, completionService);
            if (doneTask == null) {
                break;
            }
            if (!handleCompletedTask(doneTask, runId, executions, runRuntime)) {
                break;
            }
        }
    }

    private Future<ExecutionPlanResult> awaitCompletedTask(
            RunRuntime runRuntime,
            ExecutorCompletionService<ExecutionPlanResult> completionService
    ) {
        try {
            return completionService.take();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            if (runRuntime.isStopRequested()) {
                return null;
            }
            throw new WorkflowEngineException("Workflow run interrupted while waiting for completion");
        }
    }

    private boolean handleCompletedTask(
            Future<ExecutionPlanResult> doneTask,
            String runId,
            int executions,
            RunRuntime runRuntime
    ) {
        try {
            doneTask.get();
            return handleSuccess(runId, executions, runRuntime);
        } catch (CancellationException exception) {
            return handleCancellation(runRuntime);
        } catch (InterruptedException exception) {
            return handleInterrupt(runRuntime);
        } catch (ExecutionException exception) {
            return handleExecutionError(exception, runId, executions, runRuntime);
        }
    }

    private boolean handleSuccess(String runId, int executions, RunRuntime runRuntime) {
        runRuntime.incrementCompleted();
        runLifecycleService.markExecutionCompleted(runId, executions, runRuntime);
        return true;
    }

    private boolean handleCancellation(RunRuntime runRuntime) {
        if (!runRuntime.isStopRequested()) {
            runRuntime.incrementFailed();
        }
        return true;
    }

    private boolean handleInterrupt(RunRuntime runRuntime) {
        Thread.currentThread().interrupt();
        if (runRuntime.isStopRequested()) {
            return false;
        }
        throw new WorkflowEngineException("Workflow run interrupted while reading completion");
    }

    private boolean handleExecutionError(ExecutionException exception, String runId, int executions, RunRuntime runRuntime) {
        RuntimeException rootCause = ExceptionUtils.unwrapRuntime(exception.getCause() == null ? exception : exception.getCause());
        if (rootCause instanceof CancellationException || runRuntime.isStopRequested()) {
            return true;
        }
        runRuntime.incrementFailed();
        String errorMessage = ExceptionUtils.resolveMessage(rootCause);
        runRuntime.setFirstErrorMessageIfAbsent(errorMessage);
        runLifecycleService.markExecutionFailed(runId, executions, runRuntime, runRuntime.firstErrorMessage());
        log.error("Workflow execution failed: runId={}, message={}", runId, errorMessage, rootCause);
        return true;
    }

    private void finalizeRun(String runId, String workflowId, int executions, RunRuntime runRuntime) {
        ExecutionPlanRunStatus finalStatus = runLifecycleService.markFinal(runId, executions, runRuntime);
        log.debug(
                "Workflow processing finished: runId={}, id={}, status={}, submitted={}, completed={}, failed={}, message={}",
                runId, workflowId, finalStatus,
                runRuntime.submittedExecutions(), runRuntime.completed(), runRuntime.failed(), runRuntime.firstErrorMessage()
        );
    }

    private void awaitExecutionTaskDrainOnStop(RunRuntime runRuntime) {
        if (!runRuntime.isStopRequested() || runRuntime.activeExecutionTasks() <= 0) {
            return;
        }
        runRuntime.awaitNoActiveExecutionTasks();
    }
}
