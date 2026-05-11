/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.domain;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;

import java.util.Map;

/**
 * Persisted record of a past single step execution.
 * <p>
 * Captures the full input and outcome so the UI can display history and optionally
 * re-run a previous execution. All mutable fields of the original request are copied
 * into the history entry.
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
 * @param stageName            pipeline stage name
 * @param eventName            event name
 * @param state                initial set-layer state
 * @param headers              message headers
 * @param wireFormat           wire-format configuration
 * @param workflowState        workflow-level state overrides
 * @param schemaId             registered schema id when applicable
 * @param protoSchema          inline protobuf schema text when applicable
 * @param protobufRootMessage  protobuf root message name when applicable
 */
public record SingleStepExecutionHistory(
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
        String stageName,
        String eventName,
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
