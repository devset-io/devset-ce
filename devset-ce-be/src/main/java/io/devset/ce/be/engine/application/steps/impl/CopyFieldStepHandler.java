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

import io.devset.ce.be.engine.application.steps.helpers.*;

import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Handles {@code copy-field} steps that copy state values between paths.
 * <p>
 * Supports three modes: full copy between paths, selective field copy using the
 * {@code fields} config list, and merging a source map into {@code currentEvent}.
 * Delegates the actual semantics to {@link StateDataOps#copyField}.
 */
@Component
@RequiredArgsConstructor
public final class CopyFieldStepHandler implements ExecutionPlanStepHandler {

    private final StateDataOps stateDataOps;

    @Override
    public StepType supports() {
        return StepType.COPY_FIELD;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        stateDataOps.copyField(step, context.state());
    }
}
