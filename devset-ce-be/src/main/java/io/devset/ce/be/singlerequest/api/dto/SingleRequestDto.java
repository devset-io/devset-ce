/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.api.dto;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;

import java.util.Map;

/**
 * API DTO mirroring the shape of {@link io.devset.ce.be.singlerequest.domain.SingleRequestDefinition}.
 * Used for single request create/get/patch endpoints.
 *
 * @param singleRequestName unique single request name within the collection
 * @param collectionName    name of the owning collection
 * @param messageType       target broker type
 * @param contentType       payload content type
 * @param producerName      named producer/connection to send through
 * @param topic             Kafka topic; may be {@code null}
 * @param exchange          RabbitMQ exchange; may be {@code null}
 * @param routingKey        RabbitMQ routing key; may be {@code null}
 * @param executions        number of executions
 * @param stage             pipeline stage name
 * @param event             event name
 * @param state             initial execution state map
 * @param headers           message headers
 * @param wireFormat        wire-format configuration
 * @param workflowState     workflow-level state overrides
 * @param protoSchema       optional inline protobuf schema text
 */
public record SingleRequestDto(
        String singleRequestName,
        String collectionName,
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
        Object key,
        Map<String, Object> headers,
        Map<String, Object> wireFormat,
        Map<String, Object> workflowState,
        String protoSchema
) {
}
