/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import org.springframework.lang.Nullable;

import java.util.Map;

/**
 * Outbound port for dispatching execution plan messages to Kafka or RabbitMQ.
 * <p>
 * The concrete broker is selected by {@link WorkflowMessageType}. Infrastructure
 * adapters implement this interface and route the message to the appropriate
 * producer manager.
 */
public interface ExecutionPlanEventSender {

    /**
     * Sends a binary payload with an explicit content type.
     *
     * @param messageType  selects the target broker (Kafka or RabbitMQ)
     * @param contentType  payload content type used to annotate the outgoing message
     * @param producerName named producer/connection to send through
     * @param topic        Kafka topic; may be {@code null} for RabbitMQ
     * @param exchange     RabbitMQ exchange; may be {@code null} for Kafka or direct-to-queue
     * @param routingKey   RabbitMQ routing key; may be {@code null} for Kafka
     * @param key          Kafka message key; may be {@code null} for round-robin or RabbitMQ
     * @param headers      message headers to attach
     * @param message      raw binary payload
     */
    void send(
            WorkflowMessageType messageType,
            WorkflowContentType contentType,
            String producerName,
            @Nullable String topic,
            @Nullable String exchange,
            @Nullable String routingKey,
            @Nullable String key,
            Map<String, Object> headers,
            byte[] message
    );

    /**
     * Sends a text payload.
     *
     * @param messageType  selects the target broker (Kafka or RabbitMQ)
     * @param producerName named producer/connection to send through
     * @param topic        Kafka topic; may be {@code null} for RabbitMQ
     * @param exchange     RabbitMQ exchange; may be {@code null} for Kafka or direct-to-queue
     * @param routingKey   RabbitMQ routing key; may be {@code null} for Kafka
     * @param key          Kafka message key; may be {@code null} for round-robin or RabbitMQ
     * @param headers      message headers to attach
     * @param message      text payload
     */
    void send(
            WorkflowMessageType messageType,
            String producerName,
            @Nullable String topic,
            @Nullable String exchange,
            @Nullable String routingKey,
            @Nullable String key,
            Map<String, Object> headers,
            String message
    );
}
