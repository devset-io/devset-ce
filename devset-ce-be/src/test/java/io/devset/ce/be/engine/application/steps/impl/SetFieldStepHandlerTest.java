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
import io.devset.ce.be.engine.application.steps.helpers.SetFieldExpressionResolver;
import io.devset.ce.be.engine.application.steps.helpers.SetFieldTemplateResolver;
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SetFieldStepHandlerTest {

    private final SetFieldStepHandler handler = new SetFieldStepHandler(
            new StateDataOps(),
            new StepSupport(),
            new SetFieldTemplateResolver(
                    new StateDataOps(),
                    new SetFieldExpressionResolver(),
                    new ConditionEvaluator()
            ),
            new SetFieldExpressionResolver(),
            new ConditionEvaluator()
    );

    @Test
    void shouldSetLiteralValue() {
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
                "set-1",
                StepType.SET_FIELD,
                Map.of("targetPath", "currentEvent.name", "value", "test"),
                "open"
        ), context);

        assertEquals("test", context.state().get("currentEvent.name"));
    }

    @Test
    void shouldSetValueFromPath() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("original", "copied-value")),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "set-2",
                StepType.SET_FIELD,
                Map.of("targetPath", "currentEvent.copy", "valuePath", "currentEvent.original"),
                "open"
        ), context);

        assertEquals("copied-value", context.state().get("currentEvent.copy"));
    }

    @Test
    void shouldSetValueFromExpression() {
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
                "set-3",
                StepType.SET_FIELD,
                Map.of("targetPath", "currentEvent.id", "valueExpression", "uuid()"),
                "open"
        ), context);

        Object result = context.state().get("currentEvent.id");
        assertNotNull(result);
        assertInstanceOf(String.class, result);
    }

    @Test
    void shouldApplyDefaultWhenConditionFails() {
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
                "set-4",
                StepType.SET_FIELD,
                Map.of(
                        "targetPath", "currentEvent.result",
                        "value", "yes",
                        "defaultValue", "no",
                        "when", Map.of("$fn", "eq(currentEvent.x,999)")
                ),
                "open"
        ), context);

        assertEquals("no", context.state().get("currentEvent.result"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldSetValueFromTemplate() {
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("name", "Bob")),
                        ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>(),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "set-template",
                StepType.SET_FIELD,
                Map.of(
                        "targetPath", "currentEvent.profile",
                        "valueTemplate", Map.of(
                                "firstName", Map.of("$path", "currentEvent.name"),
                                "version", 1
                        )
                ),
                "open"
        ), context);

        Map<String, Object> output = (Map<String, Object>) context.state().get("currentEvent.profile");
        assertEquals("Bob", output.get("firstName"));
        assertEquals(1, output.get("version"));
    }

    @Test
    void shouldThrowWhenNoValueConfigProvided() {
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
                        "set-missing",
                        StepType.SET_FIELD,
                        Map.of("targetPath", "currentEvent.new"),
                        "open"
                ), context)
        );
        assertEquals(
                "Missing config 'value', 'valuePath', 'valueTemplate' or 'valueExpression' for step: set-missing",
                output.getMessage()
        );
    }
}
