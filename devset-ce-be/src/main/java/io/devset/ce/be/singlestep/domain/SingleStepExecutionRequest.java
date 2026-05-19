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

import io.devset.ce.be.common.domain.DomainValidation;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain record describing a request to execute a single step ad-hoc.
 * <p>
 * Used by the single step facade to run a single messaging step without a full workflow.
 * Missing optional fields are normalized: a random {@code workflowId} is generated when
 * blank, text fields are normalized to {@code null}, and defaults are applied for stage
 * and event names. Validation rules enforced in the compact constructor:
 * <ul>
 *   <li>{@code producerName} must be non-blank</li>
 *   <li>{@code executions} must be &gt; 0</li>
 *   <li>{@code set} (event payload definitions, compiled to {@code currentEvent.*})
 *       must not be empty</li>
 * </ul>
 *
 * @param workflowId          workflow identifier; generated when blank
 * @param messageType         target broker type (defaulted when {@code null})
 * @param contentType         payload content type (defaulted when {@code null})
 * @param producerName        named producer/connection to send through
 * @param topic               Kafka topic; may be {@code null}
 * @param exchange            RabbitMQ exchange; may be {@code null}
 * @param routingKey          RabbitMQ routing key; may be {@code null}
 * @param executions          number of executions; must be &gt; 0
 * @param stageName           pipeline stage name; defaulted when blank
 * @param eventName           event name; defaulted when blank
 * @param state               state map seeded before the stage runs — typically the
 *                            parent collection's {@code collectionContext}; available
 *                            for {@code $ref}/{@code $path} references from {@code set}
 * @param set                 event-payload definitions (currentEvent.*); the actual
 *                            outgoing message body; must not be empty
 * @param headers             message headers
 * @param wireFormat          wire-format configuration
 * @param workflowState       workflow-level state overrides
 * @param schemaId            optional registered schema identifier
 * @param protoSchema         optional inline protobuf schema text
 * @param protobufRootMessage optional protobuf root message name
 */
public record SingleStepExecutionRequest(
        String workflowId,
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        String topic,
        String exchange,
        String routingKey,
        Integer executions,
        String stageName,
        String eventName,
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

    private static final String DEFAULT_STAGE_NAME = "single-step";
    private static final String DEFAULT_EVENT_NAME = "single-step-event";

    public SingleStepExecutionRequest {
        workflowId = normalizeText(workflowId);
        if (workflowId == null) {
            workflowId = "single-step-" + UUID.randomUUID().toString().replace("-", "");
        }

        messageType = WorkflowMessageType.defaulted(messageType);
        contentType = WorkflowContentType.defaulted(contentType);
        producerName = DomainValidation.requireText(producerName, "producerName");
        topic = normalizeText(topic);
        exchange = normalizeText(exchange);
        routingKey = normalizeText(routingKey);
        executions = executions == null ? 1 : executions;
        if (executions <= 0) {
            throw new WorkflowEngineException("executions must be > 0");
        }

        stageName = normalizeText(stageName);
        if (stageName == null) {
            stageName = DEFAULT_STAGE_NAME;
        }

        eventName = normalizeText(eventName);
        if (eventName == null) {
            eventName = DEFAULT_EVENT_NAME;
        }

        state = state == null ? Map.of() : new LinkedHashMap<>(state);
        set = set == null ? Map.of() : new LinkedHashMap<>(set);
        if (set.isEmpty()) {
            throw new WorkflowEngineException("set (event payload) must not be empty");
        }
        headers = headers == null ? Map.of() : new LinkedHashMap<>(headers);
        wireFormat = wireFormat == null ? Map.of() : new LinkedHashMap<>(wireFormat);
        workflowState = workflowState == null ? Map.of() : new LinkedHashMap<>(workflowState);
        schemaId = normalizeText(schemaId);
        protoSchema = normalizeText(protoSchema);
        protobufRootMessage = normalizeText(protobufRootMessage);
    }

    private static String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
