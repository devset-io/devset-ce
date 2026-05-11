/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.api.dto;

import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;

import java.util.List;

/**
 * API DTO for events produced during a single execution.
 *
 * @param executionIndex zero-based execution index within its run
 * @param eventCount     total number of events in this execution
 * @param events         events produced by this execution
 */
public record ExecutionEventsDto(
        int executionIndex,
        int eventCount,
        List<ExecutionPlanEvent> events
) {
    /**
     * Creates a DTO from the domain execution events.
     *
     * @param executionEvents domain execution events
     * @return the DTO representation
     */
    public static ExecutionEventsDto from(ExecutionPlanExecutionEvents executionEvents) {
        return new ExecutionEventsDto(
                executionEvents.executionIndex(),
                executionEvents.events().size(),
                executionEvents.events()
        );
    }
}
