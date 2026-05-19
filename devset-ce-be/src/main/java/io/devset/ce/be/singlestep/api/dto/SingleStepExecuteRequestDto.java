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
 * API DTO for ad-hoc single step execution requests.
 * <p>
 * Mirrors {@link io.devset.ce.be.singlestep.domain.SingleStepExecutionRequest} but uses
 * {@code stage}/{@code event} on the wire (renamed from the domain's {@code stageName}
 * and {@code eventName} by the single step DTO mapper).
 *
 * @param workflowId          workflow identifier; generated when blank
 * @param messageType         target broker type
 * @param contentType         payload content type
 * @param producerName        named producer/connection to send through
 * @param topic               Kafka topic; may be {@code null}
 * @param exchange            RabbitMQ exchange; may be {@code null}
 * @param routingKey          RabbitMQ routing key; may be {@code null}
 * @param executions          number of executions
 * @param stage               pipeline stage name
 * @param event               event name
 * @param state               state map seeded before the stage runs — typically the
 *                            parent collection's {@code collectionContext}; available
 *                            for {@code $ref}/{@code $path} references from {@code set}
 * @param set                 event-payload definition (currentEvent.*); the actual
 *                            outgoing message body, may reference {@code state.*}
 * @param headers             message headers
 * @param wireFormat          wire-format configuration
 * @param workflowState       workflow-level state overrides
 * @param schemaId            registered schema id, when resolved from the registry
 * @param protoSchema         inline protobuf schema text, when provided
 * @param protobufRootMessage root protobuf message name, when applicable
 */
public record SingleStepExecuteRequestDto(
        String workflowId,
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        String topic,
        String exchange,
        String routingKey,
        Integer executions,
        String stage,
        String event,
        Map<String, Object> state,
        Map<String, Object> set,
        Object key,
        Map<String, Object> headers,
        Map<String, Object> wireFormat,
        Map<String, Object> workflowState,
        String schemaId,
        String protoSchema,
        String protobufRootMessage
) {
}
