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

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.engine.application.ExecutionPlanFacade;
import io.devset.ce.be.engine.application.ExecutionPlanRunSubmission;
import io.devset.ce.be.engine.application.ExecutionAsyncService;
import io.devset.ce.be.engine.application.ExecutionPlanEngine;
import io.devset.ce.be.engine.application.ProtobufStepConfigEnricher;
import io.devset.ce.be.engine.application.ExecutionPlanRunEventService;
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanExecutionEvents;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatus;
import io.devset.ce.be.engine.domain.ExecutionPlanRunStatusSnapshot;
import io.devset.ce.be.pipeline.domain.PipelineCompiler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * Infrastructure implementation of {@link ExecutionPlanFacade}.
 * <p>
 * Orchestrates workflow compilation, validation, protobuf enrichment and
 * delegation to the async execution engine and run management services.
 */
@Component
@RequiredArgsConstructor
public class ExecutionPlanFacadeImpl implements ExecutionPlanFacade {

    private final ExecutionAsyncService executionAsyncService;
    private final ExecutionPlanEngine executionPlanEngine;
    private final ProtobufStepConfigEnricher protobufStepConfigLoader;
    private final ExecutionPlanRunService runService;
    private final ExecutionPlanRunEventService runEventService;
    private final PipelineCompiler pipelineCompiler;

    @Override
    public ExecutionPlanRunSubmission executeWorkflow(Workflow workflow) {
        // FLOW: validate destination → compile DSL to ExecutionPlanInput → submit async
        //       → ExecutionAsyncService.submit() → ExecutionTaskRunner → ExecutionPlanEngine
        validateDestination(workflow);
        var compiledRequest = pipelineCompiler.compile(workflow);
        return execute(compiledRequest, workflow.executions());
    }

    @Override
    public ExecutionPlanResult simulateWorkflow(Workflow workflow) {
        var compiledRequest = pipelineCompiler.compile(workflow);
        return simulate(compiledRequest);
    }

    @Override
    public ExecutionPlanRunSubmission execute(ExecutionPlanInput compiledRequest, int executions) {
        ExecutionPlanInput resolvedRequest = protobufStepConfigLoader.load(compiledRequest);
        String runId = executionAsyncService.submit(resolvedRequest, executions);
        return new ExecutionPlanRunSubmission(runId, ExecutionPlanRunStatus.PENDING.name(), executions);
    }

    @Override
    public ExecutionPlanRunSubmission executeWithInlineProtobuf(
            ExecutionPlanInput request,
            int executions,
            String inlineDescriptor,
            String protobufRootMessage
    ) {
        ExecutionPlanInput enriched = enrichWithInlineProtobuf(request, inlineDescriptor, protobufRootMessage);
        return execute(enriched, executions);
    }

    @Override
    public ExecutionPlanResult simulate(ExecutionPlanInput compiledRequest) {
        return executionPlanEngine.simulate(protobufStepConfigLoader.load(compiledRequest));
    }

    @Override
    public ExecutionPlanRunStatusSnapshot run(String runId) {
        ExecutionPlanRunStatusSnapshot snapshot = runService.getRun(runId);
        if (snapshot == null) {
            throw new WorkflowEngineException("Workflow run not found: " + runId);
        }
        return snapshot;
    }

    @Override
    public List<ExecutionPlanRunStatusSnapshot> activeRuns() {
        return runService.getActiveRuns();
    }

    @Override
    public List<ExecutionPlanRunStatusSnapshot> completedRuns() {
        return runService.getCompletedRuns();
    }

    @Override
    public ExecutionPlanRunStatusSnapshot stopRun(String runId) {
        return executionAsyncService.stopRun(runId);
    }

    @Override
    public List<ExecutionPlanExecutionEvents> runEventsByExecution(String runId) {
        ExecutionPlanRunStatusSnapshot snapshot = runService.getRun(runId);
        if (snapshot == null) {
            throw new WorkflowEngineException("Workflow run not found: " + runId);
        }
        return runEventService.getEventsByExecution(runId);
    }

    private ExecutionPlanInput enrichWithInlineProtobuf(ExecutionPlanInput input, String descriptor, String protobufRootMessage) {
        boolean changed = false;
        List<ExecutionPlanDefinition.ExecutionStepDefinition> output = new ArrayList<>(input.definition().steps().size());
        for (ExecutionPlanDefinition.ExecutionStepDefinition step : input.definition().steps()) {
            if (!isProtobufStep(step)) {
                output.add(step);
                continue;
            }
            LinkedHashMap<String, Object> config = new LinkedHashMap<>(step.config());
            config.put(ExecutionPlanStepHandler.SCHEMA_DESCRIPTOR, descriptor);
            if (protobufRootMessage != null && !protobufRootMessage.isBlank()) {
                config.put(ExecutionPlanStepHandler.PROTOBUF_ROOT_MESSAGE, protobufRootMessage);
            }
            output.add(new ExecutionPlanDefinition.ExecutionStepDefinition(step.id(), step.type(), config, step.stageName()));
            changed = true;
        }
        if (!changed) {
            return input;
        }
        return new ExecutionPlanInput(
                new ExecutionPlanDefinition(input.definition().workflowId(), output),
                input.context(),
                input.connectors()
        );
    }

    private boolean isProtobufStep(ExecutionPlanDefinition.ExecutionStepDefinition step) {
        if (step.type() != StepType.EXECUTE_SEND && step.type() != StepType.WIRE_FORMAT) {
            return false;
        }
        Object contentType = step.config().get(ExecutionPlanStepHandler.CONTENT_TYPE);
        if (contentType == null) {
            return false;
        }
        String value = String.valueOf(contentType);
        return WorkflowContentType.PROTOBUF.externalName().equalsIgnoreCase(value)
                || WorkflowContentType.PROTOBUF.name().equalsIgnoreCase(value);
    }

    private void validateDestination(Workflow workflow) {
        if (workflow.messageType() == WorkflowMessageType.KAFKA) {
            if (workflow.topic() == null) {
                throw new WorkflowEngineException("topic must not be blank");
            }
            return;
        }
        if (workflow.topic() == null && workflow.routingKey() == null && workflow.exchange() == null) {
            throw new WorkflowEngineException("For rabbit workflow, provide topic (queue), routingKey or exchange");
        }
    }
}
