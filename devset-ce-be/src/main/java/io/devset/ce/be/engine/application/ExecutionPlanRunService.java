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

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Port for execution plan run persistence and lifecycle operations.
 * <p>
 * Implemented by infrastructure; consumed by application services.
 * Encapsulates in-memory run state, runtime handles, and connector tracking.
 */
public interface ExecutionPlanRunService {

    /**
     * Creates a new run in {@code PENDING} status and returns its mutable runtime handle.
     *
     * @param runId      the unique identifier for the run
     * @param executions the total number of requested executions
     * @param connectors the set of connectors referenced by this run, may be {@code null}
     * @return the {@link RunRuntime} handle used to track and control the run
     */
    RunRuntime savePendingRun(String runId, int executions, Set<ExecutionPlanConnectorRef> connectors);

    /**
     * Returns the mutable runtime handle for the specified run, or {@code null} if the run
     * does not exist or has already been finalized.
     *
     * @param runId the run identifier
     * @return the {@link RunRuntime}, or {@code null}
     */
    RunRuntime getRunRuntime(String runId);

    /**
     * Removes the runtime handle from the specified run, releasing resources once
     * the run has reached a terminal state.
     *
     * @param runId the run identifier
     */
    void clearRunRuntime(String runId);

    /**
     * Returns the current status snapshot for the specified run, or {@code null} if not found.
     *
     * @param runId the run identifier
     * @return the snapshot, or {@code null}
     */
    ExecutionPlanRunStatusSnapshot getRun(String runId);

    /**
     * Returns all run snapshots sorted by last update time (most recent first).
     *
     * @return an unmodifiable list of all current run snapshots
     */
    List<ExecutionPlanRunStatusSnapshot> getRuns();

    /**
     * Returns snapshots for all runs currently in an active (non-terminal) state.
     *
     * @return an unmodifiable list of active run snapshots
     */
    List<ExecutionPlanRunStatusSnapshot> getActiveRuns();

    /**
     * Returns snapshots for all runs that have reached a terminal state.
     *
     * @return an unmodifiable list of completed/failed/stopped run snapshots
     */
    List<ExecutionPlanRunStatusSnapshot> getCompletedRuns();

    /**
     * Checks whether any active run references the given connector.
     *
     * @param type          the connection type (e.g. Kafka, RabbitMQ)
     * @param connectorName the connector name to look for
     * @return {@code true} if at least one active run uses the specified connector
     */
    boolean hasActiveRunUsingConnector(ConnectionType type, String connectorName);

    /**
     * Replaces the status snapshot for an existing run with updated counters and status.
     *
     * @param runId                   the run identifier
     * @param status                  the new run status
     * @param requestedExecutions     total requested executions
     * @param submittedExecutions     executions submitted so far
     * @param completedExecutions     executions completed successfully
     * @param failedExecutions        executions that failed
     * @param errorMessage            human-readable error message, or {@code null}
     * @param completedRetentionUntil the instant after which this run may be evicted, or {@code null}
     */
    void updateSnapshot(
            String runId,
            ExecutionPlanRunStatus status,
            int requestedExecutions,
            int submittedExecutions,
            int completedExecutions,
            int failedExecutions,
            String errorMessage,
            Instant completedRetentionUntil
    );

    /**
     * Removes all runs whose retention window has expired as of the given instant.
     *
     * @param now the current instant used to evaluate expiry
     * @return the list of evicted run identifiers
     */
    List<String> evictExpiredRuns(Instant now);
}
