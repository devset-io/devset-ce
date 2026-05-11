/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.api.dto;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;

import java.util.Map;

/**
 * API DTO mirroring {@link io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory}
 * for the history endpoint. Uses {@code stage}/{@code event} on the wire instead of the
 * domain's {@code stageName}/{@code eventName} (renamed by the single step DTO mapper).
 *
 * @param id                   unique identifier of this history entry
 * @param createdAtEpochMillis creation timestamp, epoch milliseconds
 * @param runId                identifier of the underlying engine run
 * @param workflowId           workflow identifier associated with the execution
 * @param messageType          target broker type used
 * @param contentType          payload content type used
 * @param producerName         named producer/connection used
 * @param topic                Kafka topic used; may be {@code null}
 * @param exchange             RabbitMQ exchange used; may be {@code null}
 * @param routingKey           RabbitMQ routing key used; may be {@code null}
 * @param executions           number of executions that were requested
 * @param stage                pipeline stage name
 * @param event                event name
 * @param state                initial set-layer state
 * @param headers              message headers
 * @param wireFormat           wire-format configuration
 * @param workflowState        workflow-level state overrides
 * @param schemaId             registered schema id when applicable
 * @param protoSchema          inline protobuf schema text when applicable
 * @param protobufRootMessage  protobuf root message name when applicable
 */
public record SingleStepHistoryResponseDto(
        String id,
        long createdAtEpochMillis,
        String runId,
        String workflowId,
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        String topic,
        String exchange,
        String routingKey,
        int executions,
        String stage,
        String event,
        Map<String, Object> state,
        Object key,
        Map<String, Object> headers,
        Map<String, Object> wireFormat,
        Map<String, Object> workflowState,
        String schemaId,
        String protoSchema,
        String protobufRootMessage
) {
}
