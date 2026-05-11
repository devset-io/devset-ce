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
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RunLifecycleServiceTest {

    @Test
    void shouldMarkRunningAndSubmissionProgress() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        RunLifecycleService lifecycleService = new RunLifecycleService(runService);
        String runId = "run-1";
        RunRuntime runtime = new RunRuntime();

        lifecycleService.markRunning(runId, 3, runtime);

        verify(runService).updateSnapshot(
                runId, ExecutionPlanRunStatus.RUNNING, 3, 0, 0, 0, null, null
        );

        runtime.incrementSubmittedExecutions();
        lifecycleService.markExecutionSubmitted(runId, 3, runtime);

        verify(runService).updateSnapshot(
                runId, ExecutionPlanRunStatus.RUNNING, 3, 1, 0, 0, null, null
        );
    }

    @Test
    void shouldMarkStopRequestedAndStopped() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        RunLifecycleService lifecycleService = new RunLifecycleService(runService);
        String runId = "run-2";
        RunRuntime runtime = new RunRuntime();

        runtime.incrementSubmittedExecutions();
        runtime.incrementCompleted();

        ExecutionPlanRunStatusSnapshot snapshot = new ExecutionPlanRunStatusSnapshot(
                runId, ExecutionPlanRunStatus.RUNNING, 5, 1, 1, 0, null
        );
        when(runService.getRun(runId)).thenReturn(snapshot);

        lifecycleService.markStopRequested(runId, snapshot, runtime);

        verify(runService).updateSnapshot(
                runId, ExecutionPlanRunStatus.STOPPING, 5, 1, 1, 0, "Stop requested by user", null
        );

        runtime.requestStopAndCancel();
        ExecutionPlanRunStatus finalStatus = lifecycleService.markFinal(runId, 5, runtime);

        assertEquals(ExecutionPlanRunStatus.STOPPED, finalStatus);
    }

    @Test
    void shouldMarkFailedWhenAtLeastOneExecutionFailed() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        RunLifecycleService lifecycleService = new RunLifecycleService(runService);
        String runId = "run-3";
        RunRuntime runtime = new RunRuntime();

        runtime.incrementSubmittedExecutions();
        runtime.incrementFailed();
        runtime.setFirstErrorMessageIfAbsent("boom");

        ExecutionPlanRunStatus finalStatus = lifecycleService.markFinal(runId, 2, runtime);

        assertEquals(ExecutionPlanRunStatus.FAILED, finalStatus);
    }

    @Test
    void shouldMarkCompletedWhenAllExecutionsSucceed() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        RunLifecycleService lifecycleService = new RunLifecycleService(runService);
        String runId = "run-4";
        RunRuntime runtime = new RunRuntime();

        runtime.incrementSubmittedExecutions();
        runtime.incrementSubmittedExecutions();
        runtime.incrementCompleted();
        runtime.incrementCompleted();

        ExecutionPlanRunStatus finalStatus = lifecycleService.markFinal(runId, 2, runtime);

        assertEquals(ExecutionPlanRunStatus.COMPLETED, finalStatus);
    }
}
