/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WaitStepHandlerTest {

    private final WaitStepHandler handler = new WaitStepHandler(new StepSupport());

    @Test
    void shouldSetWaitMetaInSimulationMode() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                true
        );

        long before = System.currentTimeMillis();
        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "wait-1",
                StepType.WAIT,
                Map.of("millis", 1000),
                "open"
        ), context);
        long elapsed = System.currentTimeMillis() - before;

        assertEquals(1000L, context.state().get(ExecutionStateKeys.META_LAST_WAIT + ".millis"));
        assertEquals(true, context.state().get(ExecutionStateKeys.META_LAST_WAIT + ".simulated"));
        assert elapsed < 500 : "Simulation mode should not actually sleep";
    }

    @Test
    void shouldThrowOnNegativeMillis() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        assertThrows(WorkflowEngineException.class, () -> handler.handle(
                new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wait-2",
                        StepType.WAIT,
                        Map.of("millis", -1),
                        "open"
                ), context));
    }

    @Test
    void shouldFailWhenMillisMissing() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                true
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wait-missing",
                        StepType.WAIT,
                        Map.of(),
                        "open"
                ), context)
        );
        assertEquals("Missing config 'millis' for step: wait-missing", output.getMessage());
    }
}
