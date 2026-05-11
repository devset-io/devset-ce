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
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory repository for execution plan events grouped by run and execution index.
 * <p>
 * Uses a {@link ConcurrentHashMap} of {@link CopyOnWriteArrayList} to allow concurrent
 * appends from step handlers while concurrent readers observe consistent snapshots.
 * Events are kept strictly per run and per execution index; removal is explicit.
 */
@Component
public final class ExecutionPlanRunEventRepository {

    private final Map<String, Map<Integer, CopyOnWriteArrayList<ExecutionPlanEvent>>> runEvents = new ConcurrentHashMap<>();

    /**
     * Initializes event tracking for a run if not already present.
     *
     * @param runId the run identifier
     */
    public void initializeRun(String runId) {
        runEvents.putIfAbsent(runId, new ConcurrentHashMap<>());
    }

    /**
     * Initializes event tracking for a specific execution inside a run.
     *
     * @param runId          the run identifier
     * @param executionIndex the execution index inside the run
     */
    public void initializeExecution(String runId, int executionIndex) {
        runEvents.computeIfAbsent(runId, ignored -> new ConcurrentHashMap<>())
                .putIfAbsent(executionIndex, new CopyOnWriteArrayList<>());
    }

    /**
     * Appends step-level events for the given execution; empty event lists are ignored.
     *
     * @param runId          the run identifier
     * @param executionIndex the execution index inside the run
     * @param events         events to append
     */
    public void appendStepEvents(String runId, int executionIndex, List<ExecutionPlanEvent> events) {
        if (events.isEmpty()) {
            return;
        }
        runEvents.computeIfAbsent(runId, ignored -> new ConcurrentHashMap<>())
                .computeIfAbsent(executionIndex, ignored -> new CopyOnWriteArrayList<>())
                .addAll(events);
    }

    /**
     * Returns all events for a run, flattened and ordered by execution index.
     *
     * @param runId the run identifier
     * @return immutable list of events, empty if the run is unknown
     */
    public List<ExecutionPlanEvent> getEvents(String runId) {
        Map<Integer, CopyOnWriteArrayList<ExecutionPlanEvent>> byExecution = runEvents.get(runId);
        if (byExecution == null) {
            return List.of();
        }
        return byExecution.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .flatMap(entry -> entry.getValue().stream())
                .toList();
    }

    /**
     * Returns events grouped by execution index for a run.
     *
     * @param runId the run identifier
     * @return immutable list of per-execution event groups, empty if the run is unknown
     */
    public List<ExecutionPlanExecutionEvents> getEventsByExecution(String runId) {
        Map<Integer, CopyOnWriteArrayList<ExecutionPlanEvent>> byExecution = runEvents.get(runId);
        if (byExecution == null) {
            return List.of();
        }
        return byExecution.entrySet().stream()
                .sorted(Comparator.comparingInt(Map.Entry::getKey))
                .map(entry -> new ExecutionPlanExecutionEvents(entry.getKey(), List.copyOf(entry.getValue())))
                .toList();
    }

    /**
     * Discards all events for the given run.
     *
     * @param runId the run identifier
     */
    public void removeRun(String runId) {
        runEvents.remove(runId);
    }

    /**
     * Discards all events for each run in the given collection.
     *
     * @param runIds the run identifiers to purge
     */
    public void removeRuns(Collection<String> runIds) {
        runIds.forEach(runEvents::remove);
    }
}
