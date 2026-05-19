/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.infrastructure;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.engine.application.ExecutionPlanFacade;
import io.devset.ce.be.engine.application.ExecutionPlanRunSubmission;
import io.devset.ce.be.pipeline.domain.PipelineCompiler;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionRequest;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionResult;
import io.devset.ce.be.singlestep.infrastructure.persistence.SingleStepHistoryPersistenceMapper;
import io.devset.ce.be.singlestep.infrastructure.persistence.SingleStepRequestHistoryEntity;
import io.devset.ce.be.singlestep.infrastructure.persistence.SingleStepRequestHistoryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SingleStepFacadeImplTest {

    @Test
    void shouldExecuteStep() {
        Fixture fixture = new Fixture();
        SingleStepExecutionRequest request = fixture.kafkaJsonRequest();
        ExecutionPlanInput compiled = compiledPlan();
        when(fixture.pipelineCompiler.compile(any(Workflow.class))).thenReturn(compiled);
        when(fixture.executionPlanFacade.execute(compiled, 1))
                .thenReturn(new ExecutionPlanRunSubmission("run-1", "PENDING", 1));
        fixture.mockHistoryRoundTrip(historyRecord("history-1", "run-1", null, null));

        SingleStepExecutionResult output = fixture.object.execute(request);

        verify(fixture.pipelineCompiler).compile(any(Workflow.class));
        verify(fixture.executionPlanFacade).execute(compiled, 1);
        assertEquals("history-1", output.historyId());
        assertEquals("run-1", output.runId());
        assertEquals("PENDING", output.status());
        assertEquals(1, output.executions());
    }

    @Test
    void shouldReturnHistory() {
        Fixture fixture = new Fixture();
        SingleStepRequestHistoryEntity entity = mock(SingleStepRequestHistoryEntity.class);
        when(fixture.historyRepository.findAllByOrderByCreatedAtEpochMillisDescIdDesc())
                .thenReturn(List.of(entity));
        SingleStepExecutionHistory history = historyRecord("history-1", "run-1", null, null);
        when(fixture.historyPersistenceMapper.toDomain(entity)).thenReturn(history);

        List<SingleStepExecutionHistory> output = fixture.object.history();

        assertEquals(1, output.size());
        assertEquals("history-1", output.getFirst().id());
    }

    @Test
    void shouldLetWorkflowStateOverrideCollectionContextOnKeyCollision() {
        Fixture fixture = new Fixture();
        SingleStepExecutionRequest request = fixture.kafkaJsonRequestWithStates(
                Map.of("tenant", "from-collection", "env", "stage"),
                Map.of("tenant", "from-override")
        );
        ExecutionPlanInput compiled = compiledPlan();
        when(fixture.pipelineCompiler.compile(any(Workflow.class))).thenReturn(compiled);
        when(fixture.executionPlanFacade.execute(compiled, 1))
                .thenReturn(new ExecutionPlanRunSubmission("run-1", "PENDING", 1));
        fixture.mockHistoryRoundTrip(historyRecord("history-1", "run-1", null, null));

        fixture.object.execute(request);

        ArgumentCaptor<Workflow> workflowCaptor = ArgumentCaptor.forClass(Workflow.class);
        verify(fixture.pipelineCompiler).compile(workflowCaptor.capture());
        Map<String, Object> seedState = workflowCaptor.getValue().state();
        assertEquals("from-override", seedState.get("tenant"));
        assertEquals("stage", seedState.get("env"));
    }

    @Test
    void shouldHandleProtobufMetadata() {
        Fixture fixture = new Fixture();
        SingleStepExecutionRequest request = fixture.kafkaProtobufRequest();
        when(fixture.schemaFacade.resolveProtobufMetadata("proto-schema-text"))
                .thenReturn(new ProtobufSchemaDescriptor("descriptor-base64", "ResolvedRoot"));
        ExecutionPlanInput compiled = compiledPlan();
        when(fixture.pipelineCompiler.compile(any(Workflow.class))).thenReturn(compiled);
        when(fixture.executionPlanFacade.executeWithInlineProtobuf(compiled, 1, "descriptor-base64", "Root"))
                .thenReturn(new ExecutionPlanRunSubmission("run-2", "PENDING", 1));
        fixture.mockHistoryRoundTrip(historyRecord("history-2", "run-2", "proto-schema-text", "Root"));

        SingleStepExecutionResult output = fixture.object.execute(request);

        verify(fixture.schemaFacade).resolveProtobufMetadata("proto-schema-text");
        verify(fixture.executionPlanFacade).executeWithInlineProtobuf(compiled, 1, "descriptor-base64", "Root");
        assertEquals("run-2", output.runId());
        assertEquals("proto-schema-text", output.protoSchema());
        assertEquals("Root", output.protobufRootMessage());
    }

    private ExecutionPlanInput compiledPlan() {
        return new ExecutionPlanInput(
                new ExecutionPlanDefinition("workflow-1", List.of()),
                Map.of()
        );
    }

    private SingleStepExecutionHistory historyRecord(
            String historyId,
            String runId,
            String protoSchema,
            String protobufRootMessage
    ) {
        return new SingleStepExecutionHistory(
                historyId, 0L, runId, "workflow-1",
                WorkflowMessageType.KAFKA,
                protoSchema == null ? WorkflowContentType.JSON : WorkflowContentType.PROTOBUF,
                "producer-1", "workflow-topic", null, null,
                1, "open", "started",
                Map.of("payload", "x"), null, Map.of(), Map.of(), Map.of(),
                null, protoSchema, protobufRootMessage
        );
    }

    private static final class Fixture {
        final PipelineCompiler pipelineCompiler = mock(PipelineCompiler.class);
        final ExecutionPlanFacade executionPlanFacade = mock(ExecutionPlanFacade.class);
        final SchemaFacade schemaFacade = mock(SchemaFacade.class);
        final SingleStepRequestHistoryRepository historyRepository = mock(SingleStepRequestHistoryRepository.class);
        final SingleStepHistoryPersistenceMapper historyPersistenceMapper = mock(SingleStepHistoryPersistenceMapper.class);
        final SingleStepFacadeImpl object = new SingleStepFacadeImpl(
                pipelineCompiler,
                executionPlanFacade,
                schemaFacade,
                historyRepository,
                historyPersistenceMapper
        );

        SingleStepExecutionRequest kafkaJsonRequest() {
            return new SingleStepExecutionRequest(
                    "workflow-1",
                    WorkflowMessageType.KAFKA,
                    WorkflowContentType.JSON,
                    "producer-1", "workflow-topic", null, null, 1,
                    "open", "started",
                    Map.of(),
                    Map.of("payload", "x"),
                    null, Map.of(), Map.of(), Map.of(),
                    null, null, null
            );
        }

        SingleStepExecutionRequest kafkaJsonRequestWithStates(
                Map<String, Object> state,
                Map<String, Object> workflowState
        ) {
            return new SingleStepExecutionRequest(
                    "workflow-1",
                    WorkflowMessageType.KAFKA,
                    WorkflowContentType.JSON,
                    "producer-1", "workflow-topic", null, null, 1,
                    "open", "started",
                    state,
                    Map.of("payload", "x"),
                    null, Map.of(), Map.of(), workflowState,
                    null, null, null
            );
        }

        SingleStepExecutionRequest kafkaProtobufRequest() {
            return new SingleStepExecutionRequest(
                    "workflow-1",
                    WorkflowMessageType.KAFKA,
                    WorkflowContentType.PROTOBUF,
                    "producer-1", "workflow-topic", null, null, 1,
                    "open", "started",
                    Map.of(),
                    Map.of("payload", "x"),
                    null, Map.of(), Map.of(), Map.of(),
                    null, "proto-schema-text", "Root"
            );
        }

        void mockHistoryRoundTrip(SingleStepExecutionHistory persistedDomain) {
            SingleStepRequestHistoryEntity entity = mock(SingleStepRequestHistoryEntity.class);
            when(historyPersistenceMapper.toEntity(any(SingleStepExecutionHistory.class)))
                    .thenReturn(entity);
            when(historyRepository.save(entity)).thenReturn(entity);
            when(historyPersistenceMapper.toDomain(entity)).thenReturn(persistedDomain);
        }
    }
}
