/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Registry and dispatcher for all {@link ExecutionPlanStepHandler} implementations.
 * <p>
 * Spring injects every {@code ExecutionPlanStepHandler} bean; each declares the
 * {@link StepType} it handles via {@link ExecutionPlanStepHandler#supports()}.
 * Adding a new step type = add a {@link StepType} value + a {@code @Component}
 * implementing {@link ExecutionPlanStepHandler}. No change here is needed.
 */
@Component
public class StepHandlerRegistry {

    private final Map<StepType, ExecutionPlanStepHandler> handlers;

    public StepHandlerRegistry(List<ExecutionPlanStepHandler> handlers) {
        Map<StepType, ExecutionPlanStepHandler> byType = new EnumMap<>(StepType.class);
        for (ExecutionPlanStepHandler handler : handlers) {
            StepType stepType = handler.supports();
            ExecutionPlanStepHandler previous = byType.put(stepType, handler);
            if (previous != null) {
                throw new IllegalStateException(
                        "Multiple handlers registered for step type " + stepType
                                + ": " + previous.getClass().getName() + " and " + handler.getClass().getName()
                );
            }
        }
        this.handlers = Map.copyOf(byType);
    }

    /**
     * Dispatches a single step to its registered handler.
     */
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        if (Thread.currentThread().isInterrupted()) {
            throw new WorkflowEngineException("Execution interrupted before step: " + step.id());
        }
        ExecutionPlanStepHandler handler = handlers.get(step.type());
        if (handler == null) {
            throw new WorkflowEngineException("No handler registered for step type: " + step.type());
        }
        handler.handle(step, context);
    }
}
