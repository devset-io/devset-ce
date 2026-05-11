/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.infrastructure;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.rabbit.application.RabbitFacade;
import io.devset.ce.be.kafka.application.KafkaFacade;
import io.devset.ce.be.engine.application.ExecutionPlanEventSender;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Broker-fanout implementation of {@link ExecutionPlanEventSender}.
 * <p>
 * Dispatches execution plan events to either {@link KafkaFacade} or {@link RabbitFacade}
 * based on the workflow's {@link WorkflowMessageType}. Binary sends enrich headers with
 * the content type; Kafka sends require a non-blank topic.
 */
@Component
@RequiredArgsConstructor
public final class BrokerExecutionPlanEventSender implements ExecutionPlanEventSender {

    private final KafkaFacade kafkaFacade;
    private final RabbitFacade rabbitFacade;

    @Override
    public void send(
            WorkflowMessageType messageType,
            WorkflowContentType contentType,
            String producerName,
            @Nullable String topic,
            @Nullable String exchange,
            @Nullable String routingKey,
            @Nullable String key,
            Map<String, Object> headers,
            byte[] message
    ) {
        switch (messageType) {
            case KAFKA -> {
                Map<String, Object> output = new LinkedHashMap<>(headers == null ? Map.of() : headers);
                output.put("content-type", contentType.externalName());
                kafkaFacade.sendBinary(producerName, requireTopic(topic), key, output, message);
            }
            case RABBIT -> rabbitFacade.sendBinary(
                    producerName,
                    topic,
                    exchange,
                    routingKey,
                    message,
                    contentType.externalName()
            );
        }
    }

    @Override
    public void send(
            WorkflowMessageType messageType,
            String producerName,
            @Nullable String topic,
            @Nullable String exchange,
            @Nullable String routingKey,
            @Nullable String key,
            Map<String, Object> headers,
            String message
    ) {
        switch (messageType) {
            case KAFKA -> kafkaFacade.sendMessage(producerName, requireTopic(topic), key, headers, message);
            case RABBIT -> rabbitFacade.sendMessage(producerName, topic, exchange, routingKey, message);
        }
    }

    private String requireTopic(@Nullable String topic) {
        if (topic == null || topic.isBlank()) {
            throw new WorkflowEngineException("Kafka send requires topic");
        }
        return topic;
    }
}
