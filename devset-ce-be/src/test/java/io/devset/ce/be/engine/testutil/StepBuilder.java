/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.testutil;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.common.domain.StepType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Test builder for {@link ExecutionPlanDefinition.ExecutionStepDefinition} and
 * {@link ExecutionPlanInput}.
 * <p>
 * Reduces boilerplate in step-handler and engine tests by providing fluent construction
 * of step definitions and minimal execution plan inputs.
 *
 * <pre>{@code
 * // single step
 * ExecutionPlanDefinition.ExecutionStepDefinition step = StepBuilder.step("wait-1", StepType.WAIT)
 *         .config("millis", 0)
 *         .build();
 *
 * // plan with multiple steps
 * ExecutionPlanInput input = StepBuilder.plan("workflow-1")
 *         .withStep(StepBuilder.step("wait-1", StepType.WAIT).config("millis", 0).build())
 *         .withStep(StepBuilder.step("set-1", StepType.SET_FIELD).config("targetPath", "currentEvent.x").config("value", 1).build())
 *         .build();
 * }</pre>
 */
public final class StepBuilder {

    private final String id;
    private final StepType type;
    private final Map<String, Object> config = new HashMap<>();
    private String stageName = null;

    private StepBuilder(String id, StepType type) {
        this.id = id;
        this.type = type;
    }

    /** Creates a step builder with the given step ID and type. */
    public static StepBuilder step(String id, StepType type) {
        return new StepBuilder(id, type);
    }

    /** Adds a single config entry. May be called multiple times. */
    public StepBuilder config(String key, Object value) {
        config.put(key, value);
        return this;
    }

    /** Sets the full config map, replacing any previously added entries. */
    public StepBuilder config(Map<String, Object> fullConfig) {
        config.clear();
        config.putAll(fullConfig);
        return this;
    }

    /** Sets the stage name (used for grouping steps by pipeline stage). */
    public StepBuilder stageName(String stageName) {
        this.stageName = stageName;
        return this;
    }

    /** Builds the step definition. */
    public ExecutionPlanDefinition.ExecutionStepDefinition build() {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(id, type, Map.copyOf(config), stageName);
    }

    // --- Plan builder ---

    /**
     * Creates a plan builder for the given workflow ID.
     * Use {@link PlanBuilder#withStep} to add steps, then {@link PlanBuilder#build}.
     */
    public static PlanBuilder plan(String workflowId) {
        return new PlanBuilder(workflowId);
    }

    /** Fluent builder for {@link ExecutionPlanInput}. */
    public static final class PlanBuilder {

        private final String workflowId;
        private final List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>();

        private PlanBuilder(String workflowId) {
            this.workflowId = workflowId;
        }

        /** Appends a step to the plan. */
        public PlanBuilder withStep(ExecutionPlanDefinition.ExecutionStepDefinition step) {
            steps.add(step);
            return this;
        }

        /** Builds a minimal {@link ExecutionPlanInput} (empty context, no connectors). */
        public ExecutionPlanInput build() {
            return new ExecutionPlanInput(
                    new ExecutionPlanDefinition(workflowId, List.copyOf(steps)),
                    Map.of()
            );
        }
    }
}
