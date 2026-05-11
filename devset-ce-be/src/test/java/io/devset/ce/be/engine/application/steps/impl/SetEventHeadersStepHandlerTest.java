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
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SetEventHeadersStepHandlerTest {

    private final SetEventHeadersStepHandler handler = new SetEventHeadersStepHandler(
            new StateDataOps(),
            new ConditionEvaluator()
    );

    @Test
    @SuppressWarnings("unchecked")
    void shouldSetHeaders() {
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

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "headers-1",
                StepType.SET_EVENT_HEADERS,
                Map.of("headers", Map.of("eventType", "OPENED", "version", 1)),
                "open"
        ), context);

        Map<String, Object> headers = (Map<String, Object>) context.state().get(ExecutionStateKeys.CURRENT_EVENT_HEADERS);
        assertEquals("OPENED", headers.get("eventType"));
        assertEquals(1, headers.get("version"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldSkipWhenConditionFails() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("x", 1)),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "headers-2",
                StepType.SET_EVENT_HEADERS,
                Map.of(
                        "condition", Map.of("$fn", "eq(currentEvent.x,999)"),
                        "headers", Map.of("eventType", "OPENED")
                ),
                "open"
        ), context);

        Map<String, Object> headers = (Map<String, Object>) context.state().get(ExecutionStateKeys.CURRENT_EVENT_HEADERS);
        assertTrue(headers.isEmpty());
    }

    @Test
    void shouldFailWhenHeadersNotObject() {
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

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "headers-bad",
                        StepType.SET_EVENT_HEADERS,
                        Map.of("headers", "not-a-map"),
                        "open"
                ), context)
        );
        assertEquals("headers must be an object", output.getMessage());
    }
}
