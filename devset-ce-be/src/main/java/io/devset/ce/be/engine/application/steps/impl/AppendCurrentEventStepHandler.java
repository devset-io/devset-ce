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
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.springframework.stereotype.Component;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import lombok.RequiredArgsConstructor;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Handles {@code append-current-event} steps that turn the current state event into a
 * published output event.
 * <p>
 * Reads the {@code currentEvent} map, combines it with the current event headers,
 * appends it to the runtime output event list and stores a copy at
 * {@code lastAppendedEvent} for subsequent steps to reference. Respects optional
 * {@code condition} config — skipped when the condition evaluates to {@code false}.
 */
@Component
@RequiredArgsConstructor
public final class AppendCurrentEventStepHandler implements ExecutionPlanStepHandler {

    private final StateDataOps stateDataOps;
    private final StepSupport stepSupport;
    private final ConditionEvaluator conditionEvaluator;

    @Override
    public StepType supports() {
        return StepType.APPEND_CURRENT_EVENT;
    }

    @Override
    @SuppressWarnings("unchecked")
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        if (step.config().containsKey(CONDITION) && !conditionEvaluator.matches(step.config(), context, step.id())) {
            return;
        }
        Object payload = context.state().get(ExecutionStateKeys.CURRENT_EVENT);
        if (!(payload instanceof Map<?, ?> payloadMap)) {
            throw new WorkflowEngineException("currentEvent must be an object");
        }

        Map<String, Object> copiedPayload = (Map<String, Object>) stateDataOps.deepCopyValue(payloadMap);
        Map<String, Object> header = buildEventHeader(context);
        ExecutionPlanEvent executionPlanEvent = new ExecutionPlanEvent(header, copiedPayload, step.stageName());
        context.outputEvents().add(executionPlanEvent);
        context.publishStepEvent(step, executionPlanEvent);

        LinkedHashMap<String, Object> appendedEvent = new LinkedHashMap<>();
        appendedEvent.put(HEADER, header);
        String key = resolveEventKey(context);
        if (key != null) {
            appendedEvent.put(KEY, key);
        }
        appendedEvent.put(PAYLOAD, copiedPayload);
        stepSupport.stateOutputEvents(context.state()).add(appendedEvent);
        context.state().put(ExecutionStateKeys.LAST_APPENDED_EVENT, appendedEvent);
    }

    private String resolveEventKey(ExecutionPlanRuntimeContext context) {
        Object rawKey = context.state().getOrDefault(ExecutionStateKeys.CURRENT_EVENT_KEY, null);
        if (rawKey == null) {
            return null;
        }
        String key = String.valueOf(rawKey);
        return key.isEmpty() ? null : key;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildEventHeader(ExecutionPlanRuntimeContext context) {
        Object rawHeaders = context.state().getOrDefault(ExecutionStateKeys.CURRENT_EVENT_HEADERS, Collections.emptyMap());
        if (!(rawHeaders instanceof Map<?, ?> rawHeaderMap)) {
            throw new WorkflowEngineException("currentEventHeaders must be an object");
        }

        LinkedHashMap<String, Object> header = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawHeaderMap.entrySet()) {
            header.put(String.valueOf(entry.getKey()), stateDataOps.deepCopyValue(entry.getValue()));
        }
        return header;
    }
}
