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

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.engine.application.RunRuntime;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory repository for execution plan run state.
 * <p>
 * Stores run snapshots, runtime handles, and connector references in a {@link ConcurrentHashMap}.
 * Provides thread-safe access to active, completed, and expired runs and supports connector-level
 * queries to prevent removal of connectors used by active runs. Terminal runs are automatically
 * evicted after their retention window expires.
 */
@Component
public final class ExecutionPlanRunRepository {

    private final Map<String, RunState> runs = new ConcurrentHashMap<>();

    /**
     * Creates a new run in {@code PENDING} status and returns its mutable runtime handle.
     *
     * @param runId      the unique identifier for the run
     * @param executions the total number of requested executions
     * @param connectors the set of connectors referenced by this run, may be {@code null}
     * @return the {@link RunRuntime} handle used to track and control the run
     */
    public RunRuntime savePendingRun(String runId, int executions, Set<ExecutionPlanConnectorRef> connectors) {
        RunRuntime runRuntime = new RunRuntime();
        runs.put(runId, new RunState(
                new ExecutionPlanRunStatusSnapshot(
                        runId,
                        ExecutionPlanRunStatus.PENDING,
                        executions,
                        0,
                        0,
                        0,
                        null
                ),
                null,
                Instant.now(),
                connectors == null ? Set.of() : Set.copyOf(connectors),
                runRuntime
        ));
        return runRuntime;
    }

    /**
     * Returns the mutable runtime handle for the specified run, or {@code null} if the run
     * does not exist or has already been finalized.
     *
     * @param runId the run identifier
     * @return the {@link RunRuntime}, or {@code null}
     */
    public RunRuntime getRunRuntime(String runId) {
        evictExpiredRuns(Instant.now());
        RunState runState = runs.get(runId);
        return runState == null ? null : runState.runRuntime();
    }

    /**
     * Removes the runtime handle from the specified run, releasing resources once
     * the run has reached a terminal state.
     *
     * @param runId the run identifier
     */
    public void clearRunRuntime(String runId) {
        runs.computeIfPresent(runId, (id, existing) -> new RunState(
                existing.snapshot(),
                existing.expiresAt(),
                existing.updatedAt(),
                existing.connectors(),
                null
        ));
    }

    /**
     * Returns the current status snapshot for the specified run, or {@code null} if the run
     * does not exist or has been evicted.
     *
     * @param runId the run identifier
     * @return the {@link ExecutionPlanRunStatusSnapshot}, or {@code null}
     */
    public ExecutionPlanRunStatusSnapshot getRun(String runId) {
        evictExpiredRuns(Instant.now());
        RunState runState = runs.get(runId);
        return runState == null ? null : runState.snapshot();
    }

    /**
     * Returns all run snapshots sorted by last update time (most recent first).
     *
     * @return an unmodifiable list of all current run snapshots
     */
    public List<ExecutionPlanRunStatusSnapshot> getRuns() {
        evictExpiredRuns(Instant.now());
        return runs.values().stream()
                .sorted(Comparator.comparing(RunState::updatedAt).reversed())
                .map(RunState::snapshot)
                .toList();
    }

    /**
     * Returns snapshots for all runs currently in an active (non-terminal) state.
     *
     * @return an unmodifiable list of active run snapshots
     */
    public List<ExecutionPlanRunStatusSnapshot> getActiveRuns() {
        evictExpiredRuns(Instant.now());
        return getRuns().stream()
                .filter(snapshot -> isActive(snapshot.status()))
                .toList();
    }

    /**
     * Returns snapshots for all runs that have reached a terminal state.
     *
     * @return an unmodifiable list of completed/failed/stopped run snapshots
     */
    public List<ExecutionPlanRunStatusSnapshot> getCompletedRuns() {
        evictExpiredRuns(Instant.now());
        return getRuns().stream()
                .filter(snapshot -> isTerminal(snapshot.status()))
                .toList();
    }

    /**
     * Checks whether any active run references the given connector.
     *
     * @param type          the connection type (e.g. Kafka, RabbitMQ)
     * @param connectorName the connector name to look for
     * @return {@code true} if at least one active run uses the specified connector
     */
    public boolean hasActiveRunUsingConnector(ConnectionType type, String connectorName) {
        evictExpiredRuns(Instant.now());
        return runs.values().stream()
                .filter(runState -> isActive(runState.snapshot().status()))
                .anyMatch(runState -> runState.connectors().contains(new ExecutionPlanConnectorRef(type, connectorName)));
    }

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
    public void updateSnapshot(
            String runId,
            ExecutionPlanRunStatus status,
            int requestedExecutions,
            int submittedExecutions,
            int completedExecutions,
            int failedExecutions,
            String errorMessage,
            Instant completedRetentionUntil
    ) {
        runs.computeIfPresent(runId, (id, existing) -> new RunState(
                new ExecutionPlanRunStatusSnapshot(
                        runId,
                        status,
                        requestedExecutions,
                        submittedExecutions,
                        completedExecutions,
                        failedExecutions,
                        errorMessage
                ),
                completedRetentionUntil,
                Instant.now(),
                existing.connectors(),
                existing.runRuntime()
        ));
    }

    /**
     * Removes all runs whose retention window has expired as of the given instant.
     *
     * @param now the current instant used to evaluate expiry
     * @return the list of evicted run identifiers
     */
    public List<String> evictExpiredRuns(Instant now) {
        return runs.entrySet().stream()
                .filter(entry -> {
                    Instant expiresAt = entry.getValue().expiresAt();
                    return expiresAt != null && !expiresAt.isAfter(now);
                })
                .map(Map.Entry::getKey)
                .peek(runs::remove)
                .toList();
    }

    private boolean isActive(ExecutionPlanRunStatus status) {
        return status == ExecutionPlanRunStatus.PENDING
                || status == ExecutionPlanRunStatus.RUNNING
                || status == ExecutionPlanRunStatus.STOPPING;
    }

    private boolean isTerminal(ExecutionPlanRunStatus status) {
        return status == ExecutionPlanRunStatus.COMPLETED
                || status == ExecutionPlanRunStatus.FAILED
                || status == ExecutionPlanRunStatus.STOPPED;
    }

    private record RunState(
            ExecutionPlanRunStatusSnapshot snapshot,
            Instant expiresAt,
            Instant updatedAt,
            Set<ExecutionPlanConnectorRef> connectors,
            RunRuntime runRuntime
    ) {}

}
