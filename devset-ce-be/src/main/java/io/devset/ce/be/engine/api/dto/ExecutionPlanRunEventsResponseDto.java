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

import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;

import java.util.List;

/**
 * API DTO returned when fetching events for a run or a simulation.
 *
 * @param runId          run identifier, or {@code "SIMULATION"} for simulated runs
 * @param status         run status name
 * @param executionCount total number of executions represented
 * @param executions     per-execution event groups
 */
public record ExecutionPlanRunEventsResponseDto(
        String runId,
        String status,
        int executionCount,
        List<ExecutionEventsDto> executions
) {
    /**
     * Creates a response DTO from the run snapshot and its grouped execution events.
     *
     * @param snapshot        run status snapshot
     * @param executionEvents per-execution event groups
     * @return the DTO representation
     */
    public static ExecutionPlanRunEventsResponseDto from(
            ExecutionPlanRunStatusSnapshot snapshot,
            List<ExecutionPlanExecutionEvents> executionEvents
    ) {
        List<ExecutionEventsDto> executionDtos = executionEvents.stream()
                .map(ExecutionEventsDto::from)
                .toList();
        return new ExecutionPlanRunEventsResponseDto(
                snapshot.runId(),
                snapshot.status().name(),
                executionDtos.size(),
                executionDtos
        );
    }

    /**
     * Creates a response DTO from a simulation result, using the sentinel run id
     * {@code "SIMULATION"} and {@link ExecutionPlanRunStatus#COMPLETED}.
     *
     * @param simulationResult the simulation output
     * @return the DTO representation
     */
    public static ExecutionPlanRunEventsResponseDto fromSimulation(ExecutionPlanResult simulationResult) {
        List<ExecutionEventsDto> executionDtos = List.of(new ExecutionEventsDto(
                1,
                simulationResult.outputEvents().size(),
                simulationResult.outputEvents()
        ));
        return new ExecutionPlanRunEventsResponseDto(
                "SIMULATION",
                ExecutionPlanRunStatus.COMPLETED.name(),
                executionDtos.size(),
                executionDtos
        );
    }
}
