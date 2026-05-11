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

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExecutionAsyncServiceTest {

    @Test
    void shouldRejectExecutionsAboveConfiguredLimit() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        ExecutionAsyncService object = new ExecutionAsyncService(
                mock(ExecutionTaskRunner.class),
                runService,
                mock(ExecutionPlanRunEventService.class),
                new RunLifecycleService(runService),
                properties(10, 10)
        );
        try {
            WorkflowEngineException output = assertThrows(
                    WorkflowEngineException.class,
                    () -> object.submit(input(), 11)
            );
            assertEquals("executions must be <= 10", output.getMessage());
        } finally {
            object.shutdown();
        }
    }

    @Test
    void shouldRejectSubmitWhenActiveRunsLimitReached() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        when(runService.getActiveRuns()).thenReturn(List.of(
                new ExecutionPlanRunStatusSnapshot("run-1", ExecutionPlanRunStatus.RUNNING, 1, 1, 0, 0, null)
        ));
        ExecutionAsyncService object = new ExecutionAsyncService(
                mock(ExecutionTaskRunner.class),
                runService,
                mock(ExecutionPlanRunEventService.class),
                new RunLifecycleService(runService),
                properties(1, 10)
        );
        try {
            WorkflowEngineException output = assertThrows(
                    WorkflowEngineException.class,
                    () -> object.submit(input(), 1)
            );
            assertEquals("Too many active workflow runs. Max active runs is 1", output.getMessage());
        } finally {
            object.shutdown();
        }
    }

    @Test
    void shouldSubmitRunSuccessfully() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        ExecutionPlanRunEventService runEventService = mock(ExecutionPlanRunEventService.class);
        when(runService.savePendingRun(anyString(), eq(3), any())).thenReturn(new RunRuntime());
        when(runService.getActiveRuns()).thenReturn(List.of());
        ExecutionAsyncService object = new ExecutionAsyncService(
                mock(ExecutionTaskRunner.class),
                runService,
                runEventService,
                new RunLifecycleService(runService),
                properties(10, 10)
        );

        try {
            String output = object.submit(input(), 3);

            assertNotNull(output);
            verify(runService).savePendingRun(eq(output), eq(3), any());
            verify(runEventService).initializeRun(output);
        } finally {
            object.shutdown();
        }
    }

    @Test
    void shouldCreateRunWithCorrectExecutionCount() {
        ExecutionPlanRunService runService = mock(ExecutionPlanRunService.class);
        when(runService.savePendingRun(anyString(), anyInt(), any())).thenReturn(new RunRuntime());
        when(runService.getActiveRuns()).thenReturn(List.of());
        ExecutionAsyncService object = new ExecutionAsyncService(
                mock(ExecutionTaskRunner.class),
                runService,
                mock(ExecutionPlanRunEventService.class),
                new RunLifecycleService(runService),
                properties(10, 100)
        );

        try {
            object.submit(input(), 7);

            ArgumentCaptor<Integer> executions = ArgumentCaptor.forClass(Integer.class);
            verify(runService).savePendingRun(anyString(), executions.capture(), any());
            assertEquals(7, executions.getValue());
        } finally {
            object.shutdown();
        }
    }

    private ExecutionPlanInput input() {
        return new ExecutionPlanInput(
                new ExecutionPlanDefinition("workflow-1", List.of()),
                Map.of()
        );
    }

    private ExecutionAsyncProperties properties(int maxActiveRuns, int maxExecutionsPerRun) {
        ExecutionAsyncProperties properties = new ExecutionAsyncProperties();
        properties.setMaxActiveRuns(maxActiveRuns);
        properties.setMaxExecutionsPerRun(maxExecutionsPerRun);
        return properties;
    }
}
