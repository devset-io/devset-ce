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
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import io.devset.ce.be.engine.application.RunRuntime;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Infrastructure implementation of {@link ExecutionPlanRunService}.
 * Delegates to the in-memory {@link ExecutionPlanRunRepository}.
 */
@Component
@RequiredArgsConstructor
public class ExecutionPlanRunServiceImpl implements ExecutionPlanRunService {

    private final ExecutionPlanRunRepository runRepository;

    @Override
    public RunRuntime savePendingRun(String runId, int executions, Set<ExecutionPlanConnectorRef> connectors) {
        return runRepository.savePendingRun(runId, executions, connectors);
    }

    @Override
    public RunRuntime getRunRuntime(String runId) {
        return runRepository.getRunRuntime(runId);
    }

    @Override
    public void clearRunRuntime(String runId) {
        runRepository.clearRunRuntime(runId);
    }

    @Override
    public ExecutionPlanRunStatusSnapshot getRun(String runId) {
        return runRepository.getRun(runId);
    }

    @Override
    public List<ExecutionPlanRunStatusSnapshot> getRuns() {
        return runRepository.getRuns();
    }

    @Override
    public List<ExecutionPlanRunStatusSnapshot> getActiveRuns() {
        return runRepository.getActiveRuns();
    }

    @Override
    public List<ExecutionPlanRunStatusSnapshot> getCompletedRuns() {
        return runRepository.getCompletedRuns();
    }

    @Override
    public boolean hasActiveRunUsingConnector(ConnectionType type, String connectorName) {
        return runRepository.hasActiveRunUsingConnector(type, connectorName);
    }

    @Override
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
        runRepository.updateSnapshot(runId, status, requestedExecutions, submittedExecutions, completedExecutions, failedExecutions, errorMessage, completedRetentionUntil);
    }

    @Override
    public List<String> evictExpiredRuns(Instant now) {
        return runRepository.evictExpiredRuns(now);
    }
}
