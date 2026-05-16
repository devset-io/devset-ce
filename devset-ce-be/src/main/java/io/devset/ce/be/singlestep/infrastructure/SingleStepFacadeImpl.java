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

import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.engine.application.ExecutionPlanFacade;
import io.devset.ce.be.pipeline.domain.PipelineCompiler;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.singlestep.application.SingleStepFacade;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionRequest;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionResult;
import io.devset.ce.be.singlestep.infrastructure.persistence.SingleStepHistoryPersistenceMapper;
import io.devset.ce.be.singlestep.infrastructure.persistence.SingleStepRequestHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Infrastructure facade that orchestrates single-step workflow execution.
 * <p>
 * Validates the destination, resolves inline protobuf metadata when applicable,
 * compiles the request into an execution plan via {@link PipelineCompiler}, enriches
 * protobuf steps with schema descriptors, delegates execution to the engine, and
 * persists execution history.
 */
@Component
@RequiredArgsConstructor
@Transactional
public class SingleStepFacadeImpl implements SingleStepFacade {

    private static final String INLINE_SCHEMA_SUFFIX = "-inline-proto-schema";

    private final PipelineCompiler pipelineCompiler;
    private final ExecutionPlanFacade executionPlanFacade;
    private final SchemaFacade schemaFacade;
    private final SingleStepRequestHistoryRepository historyRepository;
    private final SingleStepHistoryPersistenceMapper historyPersistenceMapper;

    /**
     * Executes a single messaging step ad-hoc, without defining a full workflow.
     * <p>
     * The request is validated against the target broker (Kafka requires {@code topic};
     * Rabbit requires at least one of {@code topic}, {@code exchange}, {@code routingKey}).
     * For {@link WorkflowContentType#PROTOBUF} content the inline {@code protoSchema} is
     * resolved to a descriptor and root message; the schema is registered under
     * {@code workflowId + "-inline-proto-schema"} when no explicit {@code schemaId} is given.
     * The request is then compiled into a single-stage {@link Workflow}, submitted to the
     * engine, and a {@link SingleStepExecutionHistory} entry is persisted. Evicts the
     * cached history list on every invocation so reads see the new entry.
     *
     * @param request the validated single-step execution request
     * @return result containing history id, run id, status, executions count and resolved
     *         schema metadata
     * @throws WorkflowEngineException when destination is invalid or protobuf metadata is missing
     */
    @Override
    @CacheEvict(cacheNames = CacheNames.SINGLE_STEP_HISTORY, allEntries = true)
    public SingleStepExecutionResult execute(SingleStepExecutionRequest request) {
        validateDestination(request.messageType(), request.topic(), request.exchange(), request.routingKey());
        ProtobufInlineMetadata protobufInlineMetadata = resolveInlineProtobufMetadata(request);
        String resolvedSchemaId = resolveSchemaId(request.schemaId(), request.workflowId(), protobufInlineMetadata != null);

        Workflow workflow = toSingleStepWorkflow(request, resolvedSchemaId);
        var input = pipelineCompiler.compile(workflow);

        var submission = protobufInlineMetadata != null
                ? executionPlanFacade.executeWithInlineProtobuf(input, request.executions(), protobufInlineMetadata.descriptor(), protobufInlineMetadata.protobufRootMessage())
                : executionPlanFacade.execute(input, request.executions());
        SingleStepExecutionHistory persisted = persistHistory(request, resolvedSchemaId, protobufInlineMetadata, submission.runId());
        return new SingleStepExecutionResult(persisted.id(), submission.runId(), submission.status(), submission.executions(), request.workflowId(), request.contentType(), resolvedSchemaId, persisted.protoSchema(), persisted.protobufRootMessage());
    }


    /**
     * Returns the full single-step execution history.
     * <p>
     * Entries are ordered by creation time descending, with id as a tiebreaker, so the
     * most recently executed request appears first. The result is cached under
     * {@link CacheNames#SINGLE_STEP_HISTORY} and invalidated by {@link #execute}.
     *
     * @return list of all persisted single-step executions, newest first
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.SINGLE_STEP_HISTORY)
    public List<SingleStepExecutionHistory> history() {
        return historyRepository.findAllByOrderByCreatedAtEpochMillisDescIdDesc().stream().map(historyPersistenceMapper::toDomain).toList();
    }

    private SingleStepExecutionHistory persistHistory(SingleStepExecutionRequest request, String schemaId, ProtobufInlineMetadata protobufInlineMetadata, String runId) {
        SingleStepExecutionHistory history = new SingleStepExecutionHistory(UUID.randomUUID().toString().replace("-", ""), Instant.now().toEpochMilli(), runId, request.workflowId(), request.messageType(), request.contentType(), request.producerName(), request.topic(), request.exchange(), request.routingKey(), request.executions(), request.stageName(), request.eventName(), request.state(), request.key(), request.headers(), request.wireFormat(), request.workflowState(), schemaId, protobufInlineMetadata == null ? null : request.protoSchema(), protobufInlineMetadata == null ? null : protobufInlineMetadata.protobufRootMessage());
        return historyPersistenceMapper.toDomain(historyRepository.save(historyPersistenceMapper.toEntity(history)));
    }

    private Workflow toSingleStepWorkflow(SingleStepExecutionRequest request, String schemaId) {
        Stage stage = new Stage(request.stageName(), request.eventName(), "none", 1, Map.of(), Map.of(), request.headers(), request.key(), request.state(), Map.of(), true, null, request.wireFormat(), schemaId, null);

        return new Workflow(request.workflowId(), request.messageType(), request.contentType(), request.producerName(), request.topic(), request.exchange(), request.routingKey(), schemaId, request.executions(), request.workflowState(), List.of(stage));
    }

    private String resolveSchemaId(String requestedSchemaId, String workflowId, boolean protobufExecution) {
        if (!protobufExecution) {
            return requestedSchemaId;
        }
        if (requestedSchemaId != null && !requestedSchemaId.isBlank()) {
            return requestedSchemaId;
        }
        return workflowId + INLINE_SCHEMA_SUFFIX;
    }

    private ProtobufInlineMetadata resolveInlineProtobufMetadata(SingleStepExecutionRequest request) {
        if (request.contentType() != WorkflowContentType.PROTOBUF) {
            return null;
        }
        if (request.protoSchema() == null || request.protoSchema().isBlank()) {
            throw new WorkflowEngineException("protoSchema must be provided for protobuf contentType");
        }

        ProtobufSchemaDescriptor resolved = schemaFacade.resolveProtobufMetadata(request.protoSchema());
        String rootMessage = request.protobufRootMessage();
        if (rootMessage == null || rootMessage.isBlank()) {
            rootMessage = resolved.protobufRootMessage();
        }
        return new ProtobufInlineMetadata(resolved.descriptor(), rootMessage);
    }

    private void validateDestinationForKafka(String topic) {
        if (topic == null) {
            throw new WorkflowEngineException("topic must not be blank");
        }
    }

    private void validateDestinationForRabbit(String topic, String exchange, String routingKey) {
        if (topic == null && routingKey == null && exchange == null) {
            throw new WorkflowEngineException("For rabbit workflow, provide topic (queue), routingKey or exchange");
        }
    }

    private void validateDestination(WorkflowMessageType messageType, String topic, String exchange, String routingKey) {
        if (messageType == WorkflowMessageType.KAFKA) {
            validateDestinationForKafka(topic);
            return;
        }
        validateDestinationForRabbit(topic, exchange, routingKey);
    }

    private record ProtobufInlineMetadata(String descriptor, String protobufRootMessage) {
    }
}
