/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl.send;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import org.springframework.lang.Nullable;

/**
 * Resolved configuration for a single {@code execute-send} step.
 * <p>
 * Produced by {@link SendTargetResolver} from the step definition config map.
 * All routing fields (topic, exchange, routingKey) are nullable; their validity
 * depends on the messageType and has already been verified by the resolver.
 *
 * @param messageType          broker type (Kafka or RabbitMQ)
 * @param contentType          payload serialization format (JSON or Protobuf)
 * @param producerName         named producer connector to use for sending
 * @param topic                Kafka topic or RabbitMQ queue name; may be {@code null} for Rabbit routing-key sends
 * @param exchange             RabbitMQ exchange; {@code null} for Kafka
 * @param routingKey           RabbitMQ routing key; {@code null} for Kafka
 * @param schemaDescriptor     Base64-encoded protobuf descriptor bytes; {@code null} for JSON
 * @param protobufRootMessage  fully-qualified protobuf message type; {@code null} for JSON
 * @param sourcePath           dot-path in runtime state where the payload is read from
 */
public record SendConfig(
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        @Nullable String topic,
        @Nullable String exchange,
        @Nullable String routingKey,
        @Nullable String schemaDescriptor,
        @Nullable String protobufRootMessage,
        String sourcePath
) {}
