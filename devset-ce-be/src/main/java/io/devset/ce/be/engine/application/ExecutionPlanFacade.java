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

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;

import java.util.List;

/**
 * Facade for execution plan operations.
 * <p>
 * This is the single entry point for executing, simulating and managing
 * workflow runs. Controllers and other modules call this interface.
 */
public interface ExecutionPlanFacade {

    /**
     * Validates, compiles and submits a workflow for asynchronous execution.
     *
     * @param workflow the workflow definition including destination and pipeline
     * @return submission details with run ID and execution count
     */
    ExecutionPlanRunSubmission executeWorkflow(Workflow workflow);

    /**
     * Validates, compiles and simulates a workflow execution without sending messages.
     *
     * @param workflow the workflow definition
     * @return simulation result with generated events
     */
    ExecutionPlanResult simulateWorkflow(Workflow workflow);

    /**
     * Submits a pre-compiled execution plan for asynchronous execution.
     *
     * @param request    compiled execution plan input
     * @param executions number of executions to perform
     * @return submission details with run ID and execution count
     */
    ExecutionPlanRunSubmission execute(ExecutionPlanInput request, int executions);

    /**
     * Enriches protobuf steps with an inline descriptor and submits for execution.
     * <p>
     * Used when the protobuf schema is provided inline (not from the schema registry).
     * The descriptor is injected into all protobuf-typed steps before execution.
     *
     * @param request              compiled execution plan input
     * @param executions           number of executions to perform
     * @param inlineDescriptor     Base64-encoded protobuf FileDescriptorSet
     * @param protobufRootMessage  root message name, may be null
     * @return submission details with run ID and execution count
     */
    ExecutionPlanRunSubmission executeWithInlineProtobuf(
            ExecutionPlanInput request,
            int executions,
            String inlineDescriptor,
            String protobufRootMessage
    );

    /**
     * Simulates execution of a pre-compiled plan without sending messages.
     *
     * @param request compiled execution plan input
     * @return simulation result with generated events
     */
    ExecutionPlanResult simulate(ExecutionPlanInput request);

    /**
     * Retrieves the current status of a specific run.
     *
     * @param runId the run identifier
     * @return run status snapshot
     */
    ExecutionPlanRunStatusSnapshot run(String runId);

    /**
     * Lists all active runs (pending, running, stopping).
     *
     * @return list of active run status snapshots
     */
    List<ExecutionPlanRunStatusSnapshot> activeRuns();

    /**
     * Lists all completed runs (completed, failed, stopped).
     *
     * @return list of completed run status snapshots
     */
    List<ExecutionPlanRunStatusSnapshot> completedRuns();

    /**
     * Requests a running execution to stop.
     *
     * @param runId the run identifier
     * @return updated run status snapshot
     */
    ExecutionPlanRunStatusSnapshot stopRun(String runId);

    /**
     * Retrieves all events for a specific run grouped by execution index.
     *
     * @param runId the run identifier
     * @return events grouped by execution
     */
    List<ExecutionPlanExecutionEvents> runEventsByExecution(String runId);
}
