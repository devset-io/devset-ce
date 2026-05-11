/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.infrastructure;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.lang.Nullable;

import java.util.Map;
import java.util.Objects;

/**
 * Handles message sending and routing for RabbitMQ producers.
 * <p>
 * Package-private helper used by {@link DynamicRabbitProducerManagerImpl}.
 * Resolves routing targets (queue, exchange, routing key) and sends both
 * text and binary messages through the appropriate {@link RabbitTemplate}.
 */
@RequiredArgsConstructor
final class RabbitMessageSender {

    private final Map<String, RabbitTemplate> producers;

    /**
     * Sends a text message to a queue or exchange/routing-key combination.
     *
     * @param producerName the registered producer name
     * @param queueName    optional direct queue target
     * @param exchange     optional exchange name
     * @param routingKey   optional routing key
     * @param message      the message payload, {@code null} is sent as empty string
     */
    void sendMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            String message
    ) {
        RabbitTemplate template = requireProducer(producerName);
        String input = message == null ? "" : message;
        if (queueName != null && !queueName.isBlank()) {
            template.convertAndSend(queueName, input);
            return;
        }

        RoutingTarget target = resolveRouting(exchange, routingKey);
        template.convertAndSend(target.exchange(), target.routingKey(), input);
    }

    /**
     * Sends a binary message to a queue or exchange/routing-key combination.
     *
     * @param producerName the registered producer name
     * @param queueName    optional direct queue target
     * @param exchange     optional exchange name
     * @param routingKey   optional routing key
     * @param message      the binary payload, {@code null} is sent as empty byte array
     * @param contentType  optional content type header
     */
    void sendBinaryMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            byte[] message,
            @Nullable String contentType
    ) {
        RabbitTemplate template = requireProducer(producerName);
        byte[] input = Objects.requireNonNullElse(message, new byte[0]);
        MessagePostProcessor messagePostProcessor = value -> {
            if (contentType != null && !contentType.isBlank()) {
                value.getMessageProperties().setContentType(contentType);
            }
            return value;
        };
        if (queueName != null && !queueName.isBlank()) {
            template.convertAndSend(queueName, input, messagePostProcessor);
            return;
        }

        RoutingTarget target = resolveRouting(exchange, routingKey);
        template.convertAndSend(target.exchange(), target.routingKey(), input, messagePostProcessor);
    }

    private RabbitTemplate requireProducer(String producerName) {
        RabbitTemplate template = producers.get(producerName);
        if (template == null) {
            throw new IllegalStateException("RabbitMQ producer not found: " + producerName);
        }
        return template;
    }

    private RoutingTarget resolveRouting(@Nullable String exchange, @Nullable String routingKey) {
        String resolvedKey = routingKey;
        if (resolvedKey != null && resolvedKey.isBlank()) {
            resolvedKey = null;
        }
        if (resolvedKey == null && exchange != null && !exchange.isBlank()) {
            resolvedKey = "";
        }
        if (resolvedKey == null) {
            throw new WorkflowEngineException("RabbitMQ queueName, routingKey or exchange must not be blank");
        }
        return new RoutingTarget(Objects.requireNonNullElse(exchange, ""), resolvedKey);
    }

    private record RoutingTarget(String exchange, String routingKey) {
    }
}
