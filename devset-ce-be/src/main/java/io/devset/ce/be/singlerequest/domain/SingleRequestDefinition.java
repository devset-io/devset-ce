/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.domain;

import io.devset.ce.be.common.domain.DomainValidation;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Domain record describing a reusable single request bound to a collection.
 * <p>
 * A single request captures the full payload, headers, wire format and routing needed
 * to send one message through Kafka or RabbitMQ. Mutable map fields are defensively
 * copied, text fields are normalized to {@code null} when blank, and a default stage
 * and event name are applied when missing.
 *
 * @param singleRequestName unique, non-blank identifier within the collection
 * @param collectionName    name of the owning collection
 * @param messageType       target broker type (defaulted when {@code null})
 * @param contentType       payload content type (defaulted when {@code null})
 * @param producerName      named producer/connection to send through
 * @param topic             Kafka topic; may be {@code null}
 * @param exchange          RabbitMQ exchange; may be {@code null}
 * @param routingKey        RabbitMQ routing key; may be {@code null}
 * @param executions        number of executions; coerced to 1 when {@code null} or non-positive
 * @param stage             pipeline stage name; defaulted to {@code single-step} when blank
 * @param event             event name; defaulted to {@code single-step-event} when blank
 * @param state             initial execution state map (defensively copied)
 * @param headers           message headers (defensively copied)
 * @param wireFormat        wire-format configuration (defensively copied)
 * @param workflowState     workflow-level state overrides (defensively copied)
 * @param protoSchema       optional inline protobuf schema text
 */
public record SingleRequestDefinition(
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

    private static final String DEFAULT_STAGE_NAME = "single-step";
    private static final String DEFAULT_EVENT_NAME = "single-step-event";

    public SingleRequestDefinition {
        singleRequestName = DomainValidation.requireText(singleRequestName, "singleRequestName");
        collectionName = DomainValidation.requireText(collectionName, "collectionName");

        messageType = WorkflowMessageType.defaulted(messageType);
        contentType = WorkflowContentType.defaulted(contentType);
        producerName = normalizeText(producerName);
        topic = normalizeText(topic);
        exchange = normalizeText(exchange);
        routingKey = normalizeText(routingKey);

        if (executions == null || executions <= 0) {
            executions = 1;
        }

        stage = normalizeText(stage);
        if (stage == null) {
            stage = DEFAULT_STAGE_NAME;
        }

        event = normalizeText(event);
        if (event == null) {
            event = DEFAULT_EVENT_NAME;
        }

        state = state == null ? Map.of() : new LinkedHashMap<>(state);
        headers = headers == null ? Map.of() : new LinkedHashMap<>(headers);
        wireFormat = wireFormat == null ? Map.of() : new LinkedHashMap<>(wireFormat);
        workflowState = workflowState == null ? Map.of() : new LinkedHashMap<>(workflowState);
        protoSchema = normalizeText(protoSchema);
    }

    private static String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
