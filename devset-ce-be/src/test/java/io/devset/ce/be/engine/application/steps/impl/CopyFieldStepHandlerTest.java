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
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CopyFieldStepHandlerTest {

    private final CopyFieldStepHandler handler = new CopyFieldStepHandler(new StateDataOps());

    @Test
    void shouldCopyFieldBetweenPaths() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("source", "value-1"))
        )));

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-1",
                StepType.COPY_FIELD,
                Map.of(
                        "sourcePath", "currentEvent.source",
                        "targetPath", "currentEvent.destination"
                ),
                "open"
        ), context);

        assertEquals("value-1", context.state().get("currentEvent.destination"));
        assertEquals("value-1", context.state().get("currentEvent.source"));
    }

    @Test
    void shouldHandleMissingSourceField() {
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(Map.of("present", "value"))
        )));

        assertThrows(WorkflowEngineException.class, () -> handler.handle(
                new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "copy-2",
                        StepType.COPY_FIELD,
                        Map.of(
                                "sourcePath", "currentEvent.missing",
                                "targetPath", "currentEvent.destination"
                        ),
                        "open"
                ), context));
    }

    @Test
    void shouldHandleNullValue() {
        LinkedHashMap<String, Object> source = new LinkedHashMap<>();
        source.put("nullable", null);
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", source
        )));

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-3",
                StepType.COPY_FIELD,
                Map.of(
                        "sourcePath", "currentEvent.nullable",
                        "targetPath", "currentEvent.destination"
                ),
                "open"
        ), context);

        assertNull(context.state().get("currentEvent.destination"));
    }

    @Test
    void shouldCopySelectedFields() {
        LinkedHashMap<String, Object> source = new LinkedHashMap<>();
        source.put("name", "Alice");
        source.put("age", 30);
        source.put("email", "alice@example.com");
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", new LinkedHashMap<>(),
                "input", source
        )));

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-fields",
                StepType.COPY_FIELD,
                Map.of(
                        "sourcePath", "input",
                        "fields", List.of("name", "age")
                ),
                "open"
        ), context);

        assertEquals("Alice", context.state().get("currentEvent.name"));
        assertEquals(30, context.state().get("currentEvent.age"));
        assertThrows(
                WorkflowEngineException.class,
                () -> context.state().get("currentEvent.email")
        );
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldMergeSourceIntoCurrentEvent() {
        LinkedHashMap<String, Object> currentEvent = new LinkedHashMap<>();
        currentEvent.put("id", 1);
        currentEvent.put("status", "old");
        LinkedHashMap<String, Object> patch = new LinkedHashMap<>();
        patch.put("status", "new");
        patch.put("unrelated", "ignored-because-not-in-target");
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", currentEvent,
                "patch", patch
        )));

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-merge",
                StepType.COPY_FIELD,
                Map.of("sourcePath", "patch"),
                "open"
        ), context);

        Map<String, Object> output = (Map<String, Object>) context.state().get(ExecutionStateKeys.CURRENT_EVENT);
        assertEquals(1, output.get("id"));
        assertEquals("new", output.get("status"));
        assertEquals(false, output.containsKey("unrelated"),
                "Merge must only overwrite keys already present in currentEvent");
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldRespectExcludePaths() {
        LinkedHashMap<String, Object> currentEvent = new LinkedHashMap<>();
        currentEvent.put("name", "old-name");
        currentEvent.put("age", 20);
        LinkedHashMap<String, Object> patch = new LinkedHashMap<>();
        patch.put("name", "new-name");
        patch.put("age", 99);
        ExecutionPlanRuntimeContext context = runtimeContext(new LinkedHashMap<>(Map.of(
                "currentEvent", currentEvent,
                "patch", patch
        )));

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-exclude",
                StepType.COPY_FIELD,
                Map.of(
                        "sourcePath", "patch",
                        "excludePaths", List.of("patch.age")
                ),
                "open"
        ), context);

        Map<String, Object> output = (Map<String, Object>) context.state().get(ExecutionStateKeys.CURRENT_EVENT);
        assertEquals("new-name", output.get("name"));
        assertEquals(20, output.get("age"), "Excluded path must not be overwritten");
    }

    private ExecutionPlanRuntimeContext runtimeContext(Map<String, Object> stateRoot) {
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(stateRoot),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
    }
}
