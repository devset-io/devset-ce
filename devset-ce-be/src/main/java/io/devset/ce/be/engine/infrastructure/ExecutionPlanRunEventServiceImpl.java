/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.infrastructure;

import io.devset.ce.be.engine.application.ExecutionPlanRunEventService;
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * Infrastructure implementation of {@link ExecutionPlanRunEventService}.
 * Delegates to the in-memory {@link ExecutionPlanRunEventRepository}.
 */
@Component
@RequiredArgsConstructor
public class ExecutionPlanRunEventServiceImpl implements ExecutionPlanRunEventService {

    private final ExecutionPlanRunEventRepository runEventRepository;

    @Override
    public void initializeRun(String runId) {
        runEventRepository.initializeRun(runId);
    }

    @Override
    public void initializeExecution(String runId, int executionIndex) {
        runEventRepository.initializeExecution(runId, executionIndex);
    }

    @Override
    public void appendStepEvents(String runId, int executionIndex, List<ExecutionPlanEvent> events) {
        runEventRepository.appendStepEvents(runId, executionIndex, events);
    }

    @Override
    public List<ExecutionPlanEvent> getEvents(String runId) {
        return runEventRepository.getEvents(runId);
    }

    @Override
    public List<ExecutionPlanExecutionEvents> getEventsByExecution(String runId) {
        return runEventRepository.getEventsByExecution(runId);
    }

    @Override
    public void removeRun(String runId) {
        runEventRepository.removeRun(runId);
    }

    @Override
    public void removeRuns(Collection<String> runIds) {
        runEventRepository.removeRuns(runIds);
    }
}
