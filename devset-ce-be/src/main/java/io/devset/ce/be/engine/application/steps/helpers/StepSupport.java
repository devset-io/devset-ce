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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Shared utility methods for step handler implementations.
 * <p>
 * Provides config extraction helpers (string, int, optional) and access to the
 * mutable {@code outputEvents} list stored in runtime state. All methods throw
 * {@link WorkflowEngineException} on invalid or missing values.
 */
@Component
public final class StepSupport {

    private static final String OUTPUT_EVENTS = ExecutionStateKeys.OUTPUT_EVENTS;

    /**
     * Reads a required config value and converts it to a string.
     *
     * @param step the step whose config is read
     * @param key  config key
     * @return non-null string value
     * @throws WorkflowEngineException if the key is absent
     */
    public String stringConfig(ExecutionPlanDefinition.ExecutionStepDefinition step, String key) {
        Object value = step.config().get(key);
        if (value == null) {
            throw new WorkflowEngineException("Missing config '" + key + "' for step: " + step.id());
        }
        return String.valueOf(value);
    }

    /**
     * Reads a required config value and parses it as an integer.
     *
     * @param step the step whose config is read
     * @param key  config key
     * @return parsed integer
     * @throws WorkflowEngineException if the key is absent or not a valid number
     */
    public int intConfig(ExecutionPlanDefinition.ExecutionStepDefinition step, String key) {
        Object value = step.config().get(key);
        if (value == null) {
            throw new WorkflowEngineException("Missing config '" + key + "' for step: " + step.id());
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new WorkflowEngineException(key + " must be a number for step: " + step.id());
        }
    }

    /**
     * Reads a required non-blank string config value.
     *
     * @param step the step whose config is read
     * @param key  config key
     * @return non-null, non-blank string
     * @throws WorkflowEngineException if the key is absent or blank
     */
    public String requiredText(ExecutionPlanDefinition.ExecutionStepDefinition step, String key) {
        Object value = step.config().get(key);
        if (value == null || String.valueOf(value).isBlank()) {
            throw new WorkflowEngineException("Missing config '" + key + "' for step: " + step.id());
        }
        return String.valueOf(value);
    }

    /**
     * Converts a config value to a string, returning {@code null} for absent or blank values.
     *
     * @param value raw config value, may be {@code null}
     * @return trimmed string or {@code null}
     */
    @Nullable
    public static String optionalString(@Nullable Object value) {
        if (value == null) {
            return null;
        }
        String output = String.valueOf(value);
        return output.isBlank() ? null : output;
    }

    /**
     * Returns the mutable list stored in runtime state under {@code outputEvents}.
     *
     * @param workflowState current runtime state
     * @return mutable event list
     * @throws WorkflowEngineException if the value is not a list
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> stateOutputEvents(ExecutionPlanState workflowState) {
        Object outputEvents = workflowState.get(OUTPUT_EVENTS);
        if (!(outputEvents instanceof List<?> outputEventList)) {
            throw new WorkflowEngineException("outputEvents must be a list");
        }
        return (List<Map<String, Object>>) outputEventList;
    }
}
