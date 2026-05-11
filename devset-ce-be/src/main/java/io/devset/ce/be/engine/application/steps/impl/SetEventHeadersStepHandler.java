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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Handles {@code set-event-headers} steps that write the {@code currentEventHeaders}
 * state entry from a config headers map.
 * <p>
 * Deep-copies each header value so subsequent mutations in config do not leak into
 * runtime state. Respects optional {@code condition} config.
 */
@Component
@RequiredArgsConstructor
public final class SetEventHeadersStepHandler implements ExecutionPlanStepHandler {

    private static final String HEADERS = "headers";

    private final StateDataOps stateDataOps;
    private final ConditionEvaluator conditionEvaluator;

    @Override
    public StepType supports() {
        return StepType.SET_EVENT_HEADERS;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        if (step.config().containsKey(CONDITION) && !conditionEvaluator.matches(step.config(), context, step.id())) {
            return;
        }
        Object rawHeaders = step.config().get(HEADERS);
        if (!(rawHeaders instanceof Map<?, ?> rawHeaderMap)) {
            throw new WorkflowEngineException("headers must be an object");
        }

        LinkedHashMap<String, Object> headers = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawHeaderMap.entrySet()) {
            headers.put(String.valueOf(entry.getKey()), stateDataOps.deepCopyValue(entry.getValue()));
        }
        context.state().put(CURRENT_EVENT_HEADERS, headers);
    }
}
