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
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.StepHandlerRegistry;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BiConsumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class ExecutionPlanEngineTest {

    private final StateDataOps stateDataOps = new StateDataOps();
    private final StepHandlerRegistry stepHandlers = mock(StepHandlerRegistry.class);
    private final ExecutionPlanEngine engine = new ExecutionPlanEngine(stateDataOps, stepHandlers);

    @Test
    void shouldExecuteAllStepsSequentially() {
        ExecutionPlanDefinition.ExecutionStepDefinition step1 = step("step-1", StepType.SET_FIELD);
        ExecutionPlanDefinition.ExecutionStepDefinition step2 = step("step-2", StepType.WAIT);
        ExecutionPlanInput input = input(step1, step2);

        engine.execute(input, new ArrayList<>(), (step, events) -> {});

        InOrder inOrder = Mockito.inOrder(stepHandlers);
        inOrder.verify(stepHandlers).handle(eq(step1), any(ExecutionPlanRuntimeContext.class));
        inOrder.verify(stepHandlers).handle(eq(step2), any(ExecutionPlanRuntimeContext.class));
    }

    @Test
    void shouldStopOnStepFailure() {
        ExecutionPlanDefinition.ExecutionStepDefinition step1 = step("step-1", StepType.SET_FIELD);
        ExecutionPlanDefinition.ExecutionStepDefinition step2 = step("step-2", StepType.WAIT);
        doThrow(new WorkflowEngineException("boom"))
                .when(stepHandlers).handle(eq(step1), any(ExecutionPlanRuntimeContext.class));
        ExecutionPlanInput input = input(step1, step2);

        assertThrows(
                WorkflowEngineException.class,
                () -> engine.execute(input, new ArrayList<>(), (step, events) -> {})
        );
        verify(stepHandlers, never()).handle(eq(step2), any(ExecutionPlanRuntimeContext.class));
    }

    @Test
    void shouldEmitEventPerStep() {
        ExecutionPlanDefinition.ExecutionStepDefinition step = step("step-1", StepType.APPEND_CURRENT_EVENT);
        ExecutionPlanEvent event = new ExecutionPlanEvent(Map.of(), Map.of("id", 1), "open");
        doAnswer(invocation -> {
            ExecutionPlanRuntimeContext runtimeContext = invocation.getArgument(1);
            runtimeContext.publishStepEvent(step, event);
            return null;
        }).when(stepHandlers).handle(eq(step), any(ExecutionPlanRuntimeContext.class));
        AtomicReference<List<ExecutionPlanEvent>> captured = new AtomicReference<>();
        BiConsumer<ExecutionPlanDefinition.ExecutionStepDefinition, List<ExecutionPlanEvent>> listener =
                (capturedStep, capturedEvents) -> captured.set(capturedEvents);

        engine.execute(input(step), new ArrayList<>(), listener);

        assertNotNull(captured.get());
        assertEquals(1, captured.get().size());
        assertEquals(event, captured.get().getFirst());
    }

    @Test
    void shouldHandleEmptyPlan() {
        ExecutionPlanInput input = new ExecutionPlanInput(
                new ExecutionPlanDefinition("workflow-1", List.of()),
                Map.of("key", "value")
        );

        ExecutionPlanResult result = engine.execute(input, new ArrayList<>(), (step, events) -> {});

        assertNotNull(result);
        assertTrue(result.outputEvents().isEmpty());
        assertEquals("workflow-1", result.state().get(ExecutionStateKeys.WORKFLOW_ID));
        verify(stepHandlers, never()).handle(any(), any(ExecutionPlanRuntimeContext.class));
    }

    @Test
    void shouldSimulateWithoutSideEffects() {
        ExecutionPlanDefinition.ExecutionStepDefinition step = step("step-1", StepType.SET_FIELD);
        ArgumentCaptor<ExecutionPlanRuntimeContext> contextCaptor =
                ArgumentCaptor.forClass(ExecutionPlanRuntimeContext.class);

        engine.simulate(input(step));

        verify(stepHandlers).handle(eq(step), contextCaptor.capture());
        assertTrue(contextCaptor.getValue().simulationMode(),
                "simulate() must propagate simulationMode=true to the runtime context");
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition step(String id, StepType type) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(id, type, Map.of(), "open");
    }

    private ExecutionPlanInput input(ExecutionPlanDefinition.ExecutionStepDefinition... steps) {
        return new ExecutionPlanInput(
                new ExecutionPlanDefinition("workflow-1", List.of(steps)),
                Map.of()
        );
    }
}
