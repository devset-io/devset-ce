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
import io.devset.ce.be.engine.application.steps.helpers.*;

import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Handles {@code wait} steps that pause execution for a configurable duration.
 * <p>
 * Reads the duration from the {@code millis} config key. Skips the actual sleep when
 * the runtime is in simulation mode. Exposes {@code meta.lastWait.millis} and
 * {@code meta.lastWait.simulated} state entries for downstream steps.
 */
@Component
@RequiredArgsConstructor
public final class WaitStepHandler implements ExecutionPlanStepHandler {

    private static final String MILLIS = "millis";

    private final StepSupport stepSupport;

    @Override
    public StepType supports() {
        return StepType.WAIT;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        long millis = Long.parseLong(stepSupport.stringConfig(step, MILLIS));
        if (millis < 0) {
            throw new WorkflowEngineException("wait millis must be >= 0");
        }

        if (!context.simulationMode()) {
            try {
                Thread.sleep(Duration.ofMillis(millis));
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new WorkflowEngineException("wait interrupted for step: " + step.id());
            }
        }

        context.state().put(ExecutionStateKeys.META_LAST_WAIT + ".millis", millis);
        context.state().put(ExecutionStateKeys.META_LAST_WAIT + ".simulated", context.simulationMode());
    }
}
