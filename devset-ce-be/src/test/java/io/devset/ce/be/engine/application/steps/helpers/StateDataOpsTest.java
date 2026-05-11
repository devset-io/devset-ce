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

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;

class StateDataOpsTest {

    private final StateDataOps dataOps = new StateDataOps();

    @Test
    void shouldDeepCopyNestedMaps() {
        Map<String, Object> source = new LinkedHashMap<>(Map.of("a", new LinkedHashMap<>(Map.of("b", 1))));

        Map<String, Object> copy = dataOps.deepCopyMap(source);
        @SuppressWarnings("unchecked")
        Map<String, Object> nested = (Map<String, Object>) copy.get("a");
        nested.put("b", 2);

        @SuppressWarnings("unchecked")
        Map<String, Object> originalNested = (Map<String, Object>) source.get("a");
        assertEquals(1, originalNested.get("b"));
        assertNotSame(source.get("a"), copy.get("a"));
    }

    @Test
    void shouldCopySingleFieldToCurrentEvent() {
        ExecutionPlanState state = new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", "old")),
                "state", new LinkedHashMap<>(Map.of("userId", 123))
        )));

        ExecutionPlanDefinition.ExecutionStepDefinition step = new ExecutionPlanDefinition.ExecutionStepDefinition(
                "copy-1",
                StepType.COPY_FIELD,
                Map.of("sourcePath", "state.userId")
        );

        dataOps.copyField(step, state);

        assertEquals(123, state.get("currentEvent.userId"));
    }
}
