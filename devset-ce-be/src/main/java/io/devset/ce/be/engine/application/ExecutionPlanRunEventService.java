/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;

import java.util.Collection;
import java.util.List;

/**
 * Port for execution plan run event persistence.
 * <p>
 * Implemented by infrastructure; consumed by application services.
 * Tracks step-level events grouped by run and execution index.
 */
public interface ExecutionPlanRunEventService {

    /**
     * Initializes event tracking for a new run.
     *
     * @param runId the run identifier
     */
    void initializeRun(String runId);

    /**
     * Initializes event tracking for a specific execution within a run.
     *
     * @param runId          the run identifier
     * @param executionIndex the execution index (1-based)
     */
    void initializeExecution(String runId, int executionIndex);

    /**
     * Appends step events to a specific execution within a run.
     *
     * @param runId          the run identifier
     * @param executionIndex the execution index
     * @param events         the events to append
     */
    void appendStepEvents(String runId, int executionIndex, List<ExecutionPlanEvent> events);

    /**
     * Returns all events for a run, ordered by execution index.
     *
     * @param runId the run identifier
     * @return list of all events, or empty list if run not found
     */
    List<ExecutionPlanEvent> getEvents(String runId);

    /**
     * Returns events grouped by execution index for a run.
     *
     * @param runId the run identifier
     * @return list of execution event groups, or empty list if run not found
     */
    List<ExecutionPlanExecutionEvents> getEventsByExecution(String runId);

    /**
     * Removes all events for a single run.
     *
     * @param runId the run identifier
     */
    void removeRun(String runId);

    /**
     * Removes all events for multiple runs.
     *
     * @param runIds the run identifiers to remove
     */
    void removeRuns(Collection<String> runIds);
}
