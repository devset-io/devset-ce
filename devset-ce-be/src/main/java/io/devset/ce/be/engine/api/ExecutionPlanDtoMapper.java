/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.api;


import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.engine.api.dto.ExecutionEventsDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunEventsResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunStatusResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunsResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanSubmitResponseDto;
import io.devset.ce.be.engine.application.ExecutionPlanRunSubmission;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import io.devset.ce.be.pipeline.WorkflowDtoMapper;
import io.devset.ce.be.workflow.api.dto.WorkflowDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct mapper for execution plan API DTOs.
 * <p>
 * Handles all conversions between API DTOs and domain/application types
 * for the engine module, including workflow DTO mapping via {@link WorkflowDtoMapper}.
 */
@Mapper(componentModel = "spring", uses = WorkflowDtoMapper.class)
public interface ExecutionPlanDtoMapper {

    /**
     * Maps a workflow API DTO to the domain model.
     * Delegates to {@link WorkflowDtoMapper#toDomain(WorkflowDto)}.
     *
     * @param dto incoming workflow request
     * @return domain workflow
     */
    Workflow toWorkflow(WorkflowDto dto);

    /**
     * Maps a run status snapshot to a response DTO.
     *
     * @param snapshot the run status snapshot
     * @return the response DTO
     */
    @Mapping(target = "status", expression = "java(asStatus(snapshot.status()))")
    @Mapping(target = "active", expression = "java(isActive(snapshot.status()))")
    ExecutionPlanRunStatusResponseDto toRunStatusResponse(ExecutionPlanRunStatusSnapshot snapshot);

    /**
     * Maps a run submission to a submit response DTO.
     *
     * @param submission the submission result
     * @return the submit response DTO
     */
    default ExecutionPlanSubmitResponseDto toSubmitResponse(ExecutionPlanRunSubmission submission) {
        return new ExecutionPlanSubmitResponseDto(
                submission.runId(),
                submission.status(),
                submission.executions()
        );
    }

    /**
     * Maps active and completed run snapshots to a combined runs response DTO.
     *
     * @param active    active run snapshots
     * @param completed completed run snapshots
     * @return the combined runs response DTO
     */
    default ExecutionPlanRunsResponseDto toRunsResponse(
            List<ExecutionPlanRunStatusSnapshot> active,
            List<ExecutionPlanRunStatusSnapshot> completed
    ) {
        return new ExecutionPlanRunsResponseDto(
                active.stream().map(this::toRunStatusResponse).toList(),
                completed.stream().map(this::toRunStatusResponse).toList()
        );
    }

    /**
     * Maps a simulation result to a run events response DTO.
     *
     * @param simulationResult the simulation output
     * @return the events response DTO
     */
    default ExecutionPlanRunEventsResponseDto toSimulationResponse(ExecutionPlanResult simulationResult) {
        return ExecutionPlanRunEventsResponseDto.fromSimulation(simulationResult);
    }

    /**
     * Maps a run status snapshot and its execution events to a run events response DTO.
     *
     * @param snapshot        the run status snapshot
     * @param executionEvents events grouped by execution index
     * @return the events response DTO
     */
    default ExecutionPlanRunEventsResponseDto toRunEventsResponse(
            ExecutionPlanRunStatusSnapshot snapshot,
            List<ExecutionPlanExecutionEvents> executionEvents
    ) {
        return ExecutionPlanRunEventsResponseDto.from(snapshot, executionEvents);
    }

    default String asStatus(Enum<?> status) {
        return status == null ? null : status.name();
    }

    default boolean isActive(ExecutionPlanRunStatus status) {
        return status == ExecutionPlanRunStatus.PENDING
                || status == ExecutionPlanRunStatus.RUNNING
                || status == ExecutionPlanRunStatus.STOPPING;
    }
}
