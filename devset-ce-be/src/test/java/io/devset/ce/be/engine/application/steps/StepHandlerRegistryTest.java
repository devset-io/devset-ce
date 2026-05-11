/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.application.steps.impl.WaitStepHandler;
import io.devset.ce.be.engine.testutil.RuntimeContextBuilder;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StepHandlerRegistryTest {

    @Test
    void shouldDispatchToCorrectHandler() {
        StepHandlerRegistry registry = new StepHandlerRegistry(List.of(new WaitStepHandler(new StepSupport())));
        ExecutionPlanRuntimeContext context = runtimeContext();

        registry.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "wait-1",
                StepType.WAIT,
                Map.of("millis", 0),
                "open"
        ), context);

        assertEquals(0L, context.state().get(ExecutionStateKeys.META_LAST_WAIT + ".millis"));
    }

    @Test
    void shouldThrowOnUnknownStepType() {
        StepHandlerRegistry registry = new StepHandlerRegistry(List.of());
        ExecutionPlanRuntimeContext context = runtimeContext();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> registry.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wait-1",
                        StepType.WAIT,
                        Map.of("millis", 0),
                        "open"
                ), context)
        );
        assertTrue(output.getMessage().startsWith("No handler registered for step type"));
    }

    @Test
    void shouldRejectDuplicateHandlersForSameStepType() {
        ExecutionPlanStepHandler first = new WaitStepHandler(new StepSupport());
        ExecutionPlanStepHandler second = new WaitStepHandler(new StepSupport());

        assertThrows(
                IllegalStateException.class,
                () -> new StepHandlerRegistry(List.of(first, second))
        );
    }

    private ExecutionPlanRuntimeContext runtimeContext() {
        return RuntimeContextBuilder.context().simulationMode(true).build();
    }
}
