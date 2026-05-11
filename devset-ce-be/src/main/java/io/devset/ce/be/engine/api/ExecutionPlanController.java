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


import io.devset.ce.be.engine.api.dto.ExecutionPlanSubmitResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunEventsResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunsResponseDto;
import io.devset.ce.be.engine.api.dto.ExecutionPlanRunStatusResponseDto;
import io.devset.ce.be.engine.application.ExecutionPlanFacade;
import io.devset.ce.be.workflow.api.dto.WorkflowDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for execution plan operations.
 * <p>
 * Provides endpoints to execute workflows, simulate runs, query run status,
 * retrieve run events, list runs and stop active runs.
 * Delegates ALL logic to {@link ExecutionPlanFacade}.
 */
@RestController
@RequestMapping("/engine")
@RequiredArgsConstructor
public class ExecutionPlanController {

    private final ExecutionPlanFacade engineFacade;
    private final ExecutionPlanDtoMapper engineDtoMapper;

    /**
     * Submits a workflow for asynchronous execution.
     *
     * @param request workflow definition
     * @return submission response with run ID and status
     */
    @PostMapping("/execute")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ExecutionPlanSubmitResponseDto execute(@RequestBody WorkflowDto request) {
        return engineDtoMapper.toSubmitResponse(engineFacade.executeWorkflow(engineDtoMapper.toWorkflow(request)));
    }

    /**
     * Simulates a workflow execution without sending messages.
     *
     * @param request workflow definition
     * @return simulation result with generated events
     */
    @PostMapping("/simulate")
    public ExecutionPlanRunEventsResponseDto simulate(@RequestBody WorkflowDto request) {
        return engineDtoMapper.toSimulationResponse(engineFacade.simulateWorkflow(engineDtoMapper.toWorkflow(request)));
    }

    /**
     * Retrieves the current status of a specific run.
     *
     * @param runId the run identifier
     * @return run status snapshot
     */
    @GetMapping("/runs/{runId}")
    public ExecutionPlanRunStatusResponseDto run(@PathVariable String runId) {
        return engineDtoMapper.toRunStatusResponse(engineFacade.run(runId));
    }

    /**
     * Retrieves all events for a specific run grouped by execution.
     *
     * @param runId the run identifier
     * @return run events grouped by execution index
     */
    @GetMapping("/runs/{runId}/events")
    public ExecutionPlanRunEventsResponseDto runEvents(@PathVariable String runId) {
        return engineDtoMapper.toRunEventsResponse(engineFacade.run(runId), engineFacade.runEventsByExecution(runId));
    }

    /**
     * Lists all active and completed runs.
     *
     * @return active and completed run statuses
     */
    @GetMapping("/runs")
    public ExecutionPlanRunsResponseDto runs() {
        return engineDtoMapper.toRunsResponse(engineFacade.activeRuns(), engineFacade.completedRuns());
    }

    /**
     * Requests a running execution to stop.
     *
     * @param runId the run identifier
     * @return updated run status
     */
    @PostMapping("/runs/{runId}/stop")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ExecutionPlanRunStatusResponseDto stop(@PathVariable String runId) {
        return engineDtoMapper.toRunStatusResponse(engineFacade.stopRun(runId));
    }
}
