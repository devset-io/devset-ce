/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.helpers;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SetFieldTemplateResolverTest {

    private final SetFieldTemplateResolver resolver = new SetFieldTemplateResolver(
            new StateDataOps(),
            new SetFieldExpressionResolver(),
            new ConditionEvaluator()
    );

    @Test
    void shouldResolveSimpleTemplate() {
        ExecutionPlanRuntimeContext context = runtimeContext(Map.of());

        Object output = resolver.resolve("literal-value", context);

        assertEquals("literal-value", output);
    }

    @Test
    void shouldHandleMissingVariable() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "state", new LinkedHashMap<>()
        )));

        assertThrows(
                WorkflowEngineException.class,
                () -> resolver.resolve(Map.of("$path", "state.missing"), context)
        );
    }

    @Test
    void shouldResolveNestedTemplates() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("name", "Alice"))
        )));

        Map<String, Object> template = Map.of(
                "user", Map.of("name", Map.of("$path", "currentEvent.name")),
                "generated", Map.of("$expression", "uuid()")
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) resolver.resolve(template, context);

        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) output.get("user");
        assertEquals("Alice", user.get("name"));
        assertInstanceOf(String.class, output.get("generated"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldResolveSiblingReferenceWithTargetPath() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>()
        )));

        LinkedHashMap<String, Object> template = new LinkedHashMap<>();
        template.put("request_amount", 10);
        template.put("request_credits", Map.of("$path", "currentEvent.body.request_amount"));

        Map<String, Object> output = (Map<String, Object>) resolver.resolve(template, context, "currentEvent.body");

        assertEquals(10, output.get("request_amount"));
        assertEquals(10, output.get("request_credits"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldResolveSiblingExpressionReferenceWithTargetPath() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(),
                "state", new LinkedHashMap<>(Map.of("total", 100))
        )));

        LinkedHashMap<String, Object> template = new LinkedHashMap<>();
        template.put("request_amount", 20);
        template.put("total_requested", Map.of("$expression", "add(state.total,currentEvent.body.request_amount)"));

        Map<String, Object> output = (Map<String, Object>) resolver.resolve(template, context, "currentEvent.body");

        assertEquals(20, output.get("request_amount"));
        assertEquals(120, output.get("total_requested"));
    }

    @Test
    void shouldResolveConditionalWhenTrue() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("body",
                        new LinkedHashMap<>(Map.of("score", 50))))
        )));

        LinkedHashMap<String, Object> template = new LinkedHashMap<>();
        template.put("when", Map.of("$expression", "gt(currentEvent.body.score,0)"));
        template.put("value", Map.of("$expression", "add(currentEvent.body.score,100)"));
        template.put("default", 0);

        Object output = resolver.resolve(template, context, "currentEvent.body.result");

        assertEquals(150, output);
    }

    @Test
    void shouldResolveConditionalWhenFalse() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("body",
                        new LinkedHashMap<>(Map.of("score", 0))))
        )));

        LinkedHashMap<String, Object> template = new LinkedHashMap<>();
        template.put("when", Map.of("$expression", "gt(currentEvent.body.score,0)"));
        template.put("value", Map.of("$expression", "add(currentEvent.body.score,100)"));
        template.put("default", 0);

        Object output = resolver.resolve(template, context, "currentEvent.body.result");

        assertEquals(0, output);
    }

    @Test
    void shouldWorkWithoutTargetPath() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("name", "Alice"))
        )));

        Object output = resolver.resolve(Map.of("$path", "currentEvent.name"), context, null);

        assertEquals("Alice", output);
    }

    private ExecutionPlanRuntimeContext runtimeContext(Map<String, Object> stateRoot) {
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(stateRoot)),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
    }
}
