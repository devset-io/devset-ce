/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static io.devset.ce.be.common.domain.DomainValidation.requireText;

/**
 * Top-level workflow DSL definition consumed by the pipeline compiler.
 * <p>
 * Bundles routing information (broker, destination, producer name) with the sequence
 * of pipeline stages. The compact constructor validates presence of {@code id},
 * {@code producerName} and a non-empty {@code pipeline}, applies broker/content-type
 * defaults, normalizes blank text fields to {@code null}, and defaults
 * {@code executions} to {@code 1}.
 *
 * @param id            unique workflow identifier
 * @param messageType   target broker type (defaulted)
 * @param contentType   payload content type (defaulted)
 * @param producerName  named producer/connection to dispatch through
 * @param topic         Kafka topic; may be {@code null}
 * @param exchange      RabbitMQ exchange; may be {@code null}
 * @param routingKey    RabbitMQ routing key; may be {@code null}
 * @param schemaId      optional registered schema identifier
 * @param executions    number of executions; defaulted to {@code 1}, must be &gt; 0
 * @param state         initial workflow state map
 * @param pipeline      ordered, non-empty list of pipeline stages
 */
public record Workflow(
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
) {

    /**
     * Convenience constructor for Kafka workflows with a schema id.
     */
    public Workflow(
            String id,
            WorkflowMessageType messageType,
            String producerName,
            String topic,
            String schemaId,
            Integer executions,
            Map<String, Object> state,
            List<Stage> pipeline
    ) {
        this(id, messageType, null, producerName, topic, null, null, schemaId, executions, state, pipeline);
    }

    /**
     * Convenience constructor defaulting broker, content type and schema.
     */
    public Workflow(
            String id,
            String producerName,
            String topic,
            Integer executions,
            Map<String, Object> state,
            List<Stage> pipeline
    ) {
        this(id, null, null, producerName, topic, null, null, null, executions, state, pipeline);
    }

    /**
     * Convenience constructor for Kafka workflows without a schema id.
     */
    public Workflow(
            String id,
            WorkflowMessageType messageType,
            String producerName,
            String topic,
            Integer executions,
            Map<String, Object> state,
            List<Stage> pipeline
    ) {
        this(id, messageType, null, producerName, topic, null, null, null, executions, state, pipeline);
    }

    /**
     * Convenience constructor with explicit content type but no schema.
     */
    public Workflow(
            String id,
            WorkflowMessageType messageType,
            WorkflowContentType contentType,
            String producerName,
            String topic,
            Integer executions,
            Map<String, Object> state,
            List<Stage> pipeline
    ) {
        this(id, messageType, contentType, producerName, topic, null, null, null, executions, state, pipeline);
    }

    public Workflow {
        id = requireText(id, "id");
        messageType = WorkflowMessageType.defaulted(messageType);
        contentType = WorkflowContentType.defaulted(contentType);
        producerName = requireText(producerName, "producerName");
        topic = normalizeText(topic);
        exchange = normalizeText(exchange);
        routingKey = normalizeText(routingKey);
        schemaId = schemaId == null || schemaId.isBlank() ? null : schemaId;
        executions = executions == null ? 1 : executions;
        if (executions <= 0) {
            throw new WorkflowEngineException("executions must be > 0");
        }
        state = state == null ? Map.of() : new LinkedHashMap<>(state);
        pipeline = pipeline == null ? List.of() : List.copyOf(pipeline);
        if (pipeline.isEmpty()) {
            throw new WorkflowEngineException("pipeline must not be empty");
        }
    }

    private static String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
