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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StepSupportTest {

    private final StepSupport support = new StepSupport();

    @Test
    void shouldReturnStringConfig() {
        ExecutionPlanDefinition.ExecutionStepDefinition step = stepWithConfig(Map.of("name", "producer-1"));

        String output = support.stringConfig(step, "name");

        assertEquals("producer-1", output);
    }

    @Test
    void shouldThrowWhenStringConfigMissing() {
        ExecutionPlanDefinition.ExecutionStepDefinition step = stepWithConfig(Map.of());

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> support.stringConfig(step, "name")
        );
        assertEquals("Missing config 'name' for step: step-1", output.getMessage());
    }

    @Test
    void shouldReturnIntConfig() {
        ExecutionPlanDefinition.ExecutionStepDefinition stepWithInt =
                stepWithConfig(Map.of("millis", 1000));
        ExecutionPlanDefinition.ExecutionStepDefinition stepWithString =
                stepWithConfig(Map.of("millis", "500"));

        assertEquals(1000, support.intConfig(stepWithInt, "millis"));
        assertEquals(500, support.intConfig(stepWithString, "millis"));
    }

    @Test
    void shouldReturnRequiredTextConfig() {
        ExecutionPlanDefinition.ExecutionStepDefinition step = stepWithConfig(Map.of("type", "binary-prefix"));

        assertEquals("binary-prefix", support.requiredText(step, "type"));
        assertThrows(
                WorkflowEngineException.class,
                () -> support.requiredText(stepWithConfig(Map.of("type", "  ")), "type")
        );
    }

    @Test
    void shouldReturnOptionalStringOrNull() {
        assertEquals("value-1", StepSupport.optionalString("value-1"));
        assertNull(StepSupport.optionalString(null));
        assertNull(StepSupport.optionalString(""));
        assertNull(StepSupport.optionalString("   "));
    }

    @Test
    void shouldReturnStateOutputEvents() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        List<Map<String, Object>> events = new ArrayList<>();
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, events);
        ExecutionPlanState state = new ExecutionPlanState(root);

        List<Map<String, Object>> output = support.stateOutputEvents(state);

        assertEquals(events, output);
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition stepWithConfig(Map<String, Object> config) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(
                "step-1",
                StepType.SET_FIELD,
                config,
                "open"
        );
    }
}
