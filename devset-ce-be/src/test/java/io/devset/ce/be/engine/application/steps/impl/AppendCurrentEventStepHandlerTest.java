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
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppendCurrentEventStepHandlerTest {

    private final AppendCurrentEventStepHandler handler = new AppendCurrentEventStepHandler(
            new StateDataOps(),
            new StepSupport(),
            new ConditionEvaluator()
    );

    @Test
    void shouldStoreLastAppendedEventAsMutableMap() {
        ExecutionPlanRuntimeContext context = runtimeContext(
                new LinkedHashMap<>(Map.of("id", 1)),
                new LinkedHashMap<>()
        );

        handler.handle(appendStep("append-1"), context);

        byte[] output = new byte[] {0x01, 0x02};
        context.state().put(ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload", output);
        assertArrayEquals(output, (byte[]) context.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldAppendEventToOutputEvents() {
        LinkedHashMap<String, Object> currentEvent = new LinkedHashMap<>(Map.of("id", 42));
        LinkedHashMap<String, Object> headers = new LinkedHashMap<>(Map.of("eventType", "CREATED"));
        ExecutionPlanRuntimeContext context = runtimeContext(currentEvent, headers);
        AtomicReference<ExecutionPlanEvent> emitted = new AtomicReference<>();
        ExecutionPlanRuntimeContext listeningContext = new ExecutionPlanRuntimeContext(
                context.state(),
                context.outputEvents(),
                (step, event) -> emitted.set(event),
                false
        );

        handler.handle(appendStep("append-1"), listeningContext);

        assertEquals(1, listeningContext.outputEvents().size());
        ExecutionPlanEvent output = listeningContext.outputEvents().getFirst();
        assertEquals(Map.of("id", 42), output.payload());
        assertEquals(Map.of("eventType", "CREATED"), output.header());
        assertEquals("open", output.stageName());
        assertNotNull(emitted.get(), "publishStepEvent must notify listener");
        assertEquals(output, emitted.get());

        Map<String, Object> lastAppended = (Map<String, Object>) listeningContext.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT);
        assertEquals(Map.of("id", 42), lastAppended.get("payload"));
        List<Map<String, Object>> stateOutputs =
                (List<Map<String, Object>>) listeningContext.state().get(ExecutionStateKeys.OUTPUT_EVENTS);
        assertEquals(1, stateOutputs.size());
        assertEquals(lastAppended, stateOutputs.getFirst());
    }

    @Test
    void shouldSkipWhenConditionFails() {
        LinkedHashMap<String, Object> currentEvent = new LinkedHashMap<>(Map.of("x", 1));
        ExecutionPlanRuntimeContext context = runtimeContext(currentEvent, new LinkedHashMap<>());

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "append-2",
                StepType.APPEND_CURRENT_EVENT,
                Map.of("condition", Map.of("$fn", "eq(currentEvent.x,999)")),
                "open"
        ), context);

        assertTrue(context.outputEvents().isEmpty());
    }

    @Test
    void shouldFailWhenCurrentEventIsNotObject() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.CURRENT_EVENT, "not-a-map");
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>());
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root), new ArrayList<>(), (step, event) -> {}, false
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(appendStep("append-3"), context)
        );
        assertEquals("currentEvent must be an object", output.getMessage());
    }

    @Test
    void shouldFailWhenCurrentEventHeadersIsNotObject() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)));
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, "not-a-map");
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root), new ArrayList<>(), (step, event) -> {}, false
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(appendStep("append-4"), context)
        );
        assertEquals("currentEventHeaders must be an object", output.getMessage());
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldIncludeKeyInAppendedEventWhenCurrentEventKeyIsSet() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)));
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>());
        root.put(ExecutionStateKeys.CURRENT_EVENT_KEY, "user-42");
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root), new ArrayList<>(), (step, event) -> {}, false
        );

        handler.handle(appendStep("append-key"), context);

        Map<String, Object> lastAppended = (Map<String, Object>) context.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT);
        assertEquals("user-42", lastAppended.get("key"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldOmitKeyInAppendedEventWhenCurrentEventKeyIsEmpty() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 1)));
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>());
        root.put(ExecutionStateKeys.CURRENT_EVENT_KEY, "");
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root), new ArrayList<>(), (step, event) -> {}, false
        );

        handler.handle(appendStep("append-no-key"), context);

        Map<String, Object> lastAppended = (Map<String, Object>) context.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT);
        assertEquals(false, lastAppended.containsKey("key"));
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition appendStep(String id) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(
                id, StepType.APPEND_CURRENT_EVENT, Map.of(), "open"
        );
    }

    private ExecutionPlanRuntimeContext runtimeContext(
            LinkedHashMap<String, Object> currentEvent,
            LinkedHashMap<String, Object> currentEventHeaders
    ) {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.CURRENT_EVENT, currentEvent);
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, currentEventHeaders);
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root), new ArrayList<>(), (step, event) -> {}, false
        );
    }
}
