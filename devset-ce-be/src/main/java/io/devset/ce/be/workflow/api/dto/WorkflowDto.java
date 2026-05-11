/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.api.dto;

import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.Stage;

import java.util.List;
import java.util.Map;

/**
 * API DTO mirroring the shape of {@link io.devset.ce.be.common.domain.Workflow}.
 * Used for workflow DSL CRUD and execute/simulate endpoints.
 *
 * @param id           unique workflow identifier
 * @param messageType  target broker type
 * @param contentType  payload content type
 * @param producerName named producer/connection to dispatch through
 * @param topic        Kafka topic; may be {@code null}
 * @param exchange     RabbitMQ exchange; may be {@code null}
 * @param routingKey   RabbitMQ routing key; may be {@code null}
 * @param schemaId     optional registered schema identifier
 * @param executions   number of executions
 * @param state        initial workflow state map
 * @param pipeline     ordered list of pipeline stages
 */
public record WorkflowDto(
        String id,
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        String topic,
        String exchange,
        String routingKey,
        String schemaId,
        Integer executions,
        Map<String, Object> state,
        List<Stage> pipeline
) {}
