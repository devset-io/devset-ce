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

import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;

import io.devset.ce.be.engine.application.steps.StepHandlerRegistry;

import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Handles {@code repeat} steps that execute a nested sequence of steps multiple times.
 * <p>
 * Runs nested steps up to {@code times} iterations. Supports {@code repeatWhile}
 * (evaluated before each iteration; loop breaks when false) and {@code repeatUntil}
 * (evaluated after each iteration; loop breaks when true). Exposes loop meta values
 * ({@code meta.loop.currentIteration}, {@code meta.loop.totalIterations}) in state.
 * <p>
 * Nested steps are stored as a typed {@code List<ExecutionStepDefinition>} in the
 * {@code steps} config entry — no serialization/deserialization round-trip.
 */
@Component
public final class RepeatStepHandler implements ExecutionPlanStepHandler {

    private static final String TIMES = "times";
    private static final String STEPS = "steps";
    private static final String REPEAT_WHILE = "repeatWhile";
    private static final String REPEAT_UNTIL = "repeatUntil";

    private final StepSupport stepSupport;
    private final StepHandlerRegistry workflowStepHandlers;
    private final ConditionEvaluator conditionEvaluator;

    public RepeatStepHandler(
            StepSupport stepSupport,
            @Lazy StepHandlerRegistry workflowStepHandlers,
            ConditionEvaluator conditionEvaluator
    ) {
        this.stepSupport = stepSupport;
        this.workflowStepHandlers = workflowStepHandlers;
        this.conditionEvaluator = conditionEvaluator;
    }

    @Override
    public StepType supports() {
        return StepType.REPEAT;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        ensureNotInterrupted(step.id());
        int times = stepSupport.intConfig(step, TIMES);
        List<ExecutionPlanDefinition.ExecutionStepDefinition> nestedSteps = nestedSteps(step);

        for (int iteration = 0; iteration < times; iteration++) {
            ensureNotInterrupted(step.id());
            if (step.config().containsKey(REPEAT_WHILE)
                    && step.config().get(REPEAT_WHILE) != null
                    && !conditionEvaluator.matches(step.config(), REPEAT_WHILE, context, step.id())) {
                break;
            }
            context.state().put(ExecutionStateKeys.META_LOOP + ".currentIteration", iteration + 1);
            context.state().put(ExecutionStateKeys.META_LOOP + ".totalIterations", times);
            for (ExecutionPlanDefinition.ExecutionStepDefinition nestedStep : nestedSteps) {
                ensureNotInterrupted(step.id());
                workflowStepHandlers.handle(nestedStep, context);
            }
            if (step.config().containsKey(REPEAT_UNTIL)
                    && step.config().get(REPEAT_UNTIL) != null
                    && conditionEvaluator.matches(step.config(), REPEAT_UNTIL, context, step.id())) {
                break;
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static List<ExecutionPlanDefinition.ExecutionStepDefinition> nestedSteps(
            ExecutionPlanDefinition.ExecutionStepDefinition step
    ) {
        Object rawSteps = step.config().get(STEPS);
        if (!(rawSteps instanceof List<?> rawStepList)) {
            throw new WorkflowEngineException("repeat requires steps list");
        }
        for (Object entry : rawStepList) {
            if (!(entry instanceof ExecutionPlanDefinition.ExecutionStepDefinition)) {
                throw new WorkflowEngineException("repeat steps must be ExecutionStepDefinition instances");
            }
        }
        return (List<ExecutionPlanDefinition.ExecutionStepDefinition>) rawStepList;
    }

    private void ensureNotInterrupted(String stepId) {
        if (Thread.currentThread().isInterrupted()) {
            throw new WorkflowEngineException("repeat interrupted for step: " + stepId);
        }
    }
}
