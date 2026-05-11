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

import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExecutionPlanRunEventRepositoryTest {

    private ExecutionPlanRunEventRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ExecutionPlanRunEventRepository();
    }

    @Test
    void shouldInitializeAndAppendEvents() {
        // given
        String runId = "run-1";
        ExecutionPlanEvent event1 = new ExecutionPlanEvent(Map.of(), Map.of("id", 1), "stage-1");
        ExecutionPlanEvent event2 = new ExecutionPlanEvent(Map.of(), Map.of("id", 2), "stage-1");

        // when
        repository.initializeRun(runId);
        repository.initializeExecution(runId, 0);
        repository.appendStepEvents(runId, 0, List.of(event1, event2));

        // then
        List<ExecutionPlanEvent> events = repository.getEvents(runId);
        assertEquals(2, events.size());
        assertEquals(event1, events.get(0));
        assertEquals(event2, events.get(1));
    }

    @Test
    void shouldReturnEmptyForUnknownRun() {
        // when
        List<ExecutionPlanEvent> events = repository.getEvents("unknown");

        // then
        assertTrue(events.isEmpty());
    }

    @Test
    void shouldGroupEventsByExecution() {
        // given
        String runId = "run-1";
        ExecutionPlanEvent eventExec1 = new ExecutionPlanEvent(Map.of(), Map.of("id", 1), "stage-1");
        ExecutionPlanEvent eventExec2 = new ExecutionPlanEvent(Map.of(), Map.of("id", 2), "stage-2");

        repository.initializeRun(runId);
        repository.initializeExecution(runId, 0);
        repository.initializeExecution(runId, 1);
        repository.appendStepEvents(runId, 0, List.of(eventExec1));
        repository.appendStepEvents(runId, 1, List.of(eventExec2));

        // when
        List<ExecutionPlanExecutionEvents> grouped = repository.getEventsByExecution(runId);

        // then
        assertEquals(2, grouped.size());
        assertEquals(0, grouped.get(0).executionIndex());
        assertEquals(List.of(eventExec1), grouped.get(0).events());
        assertEquals(1, grouped.get(1).executionIndex());
        assertEquals(List.of(eventExec2), grouped.get(1).events());
    }

    @Test
    void shouldRemoveRun() {
        // given
        String runId = "run-1";
        ExecutionPlanEvent event = new ExecutionPlanEvent(Map.of(), Map.of("id", 1), "stage-1");
        repository.initializeRun(runId);
        repository.initializeExecution(runId, 0);
        repository.appendStepEvents(runId, 0, List.of(event));

        // when
        repository.removeRun(runId);

        // then
        assertTrue(repository.getEvents(runId).isEmpty());
    }

    @Test
    void shouldRemoveMultipleRuns() {
        // given
        String runId1 = "run-1";
        String runId2 = "run-2";
        ExecutionPlanEvent event = new ExecutionPlanEvent(Map.of(), Map.of("id", 1), "stage-1");

        repository.initializeRun(runId1);
        repository.initializeExecution(runId1, 0);
        repository.appendStepEvents(runId1, 0, List.of(event));

        repository.initializeRun(runId2);
        repository.initializeExecution(runId2, 0);
        repository.appendStepEvents(runId2, 0, List.of(event));

        // when
        repository.removeRuns(List.of(runId1, runId2));

        // then
        assertTrue(repository.getEvents(runId1).isEmpty());
        assertTrue(repository.getEvents(runId2).isEmpty());
    }
}
