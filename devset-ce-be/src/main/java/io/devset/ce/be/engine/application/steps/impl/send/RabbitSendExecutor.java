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
import io.devset.ce.be.engine.application.ExecutionPlanEventSender;
import io.devset.ce.be.engine.application.steps.helpers.PayloadBuilder;
import io.devset.ce.be.engine.application.steps.impl.send.SendEnvelopeBuilder.SendEnvelope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Sends a single event envelope to RabbitMQ via {@link ExecutionPlanEventSender}.
 * <p>
 * Handles all three payload variants: pre-serialized {@code byte[]},
 * JSON-serialized object, and protobuf-serialized object.
 * Routing (queue, exchange, routingKey) is taken from {@link SendConfig} as
 * already resolved by {@link SendTargetResolver}.
 */
@Component
@RequiredArgsConstructor
public final class RabbitSendExecutor {

    private final ExecutionPlanEventSender eventSender;
    private final PayloadBuilder payloadBuilder;

    /**
     * Sends a single envelope to RabbitMQ using the routing config from {@code sendConfig}.
     *
     * @param config   resolved send configuration (producerName, topic/exchange/routingKey, contentType, etc.)
     * @param envelope extracted headers and payload for this message
     * @param stepId   step identifier used in error messages
     */
    public void execute(SendConfig config, SendEnvelope envelope, String stepId) {
        if (envelope.payload() instanceof byte[] payloadBytes) {
            eventSender.send(WorkflowMessageType.RABBIT, config.contentType(),
                    config.producerName(), config.topic(), config.exchange(), config.routingKey(),
                    null, envelope.headers(), payloadBytes);
            return;
        }
        switch (config.contentType()) {
            case JSON -> {
                String message = payloadBuilder.toJson(envelope.payload(), stepId);
                eventSender.send(WorkflowMessageType.RABBIT,
                        config.producerName(), config.topic(), config.exchange(), config.routingKey(),
                        null, envelope.headers(), message);
            }
            case PROTOBUF -> {
                byte[] message = payloadBuilder.toProtobufBytes(
                        envelope.payload(), config.schemaDescriptor(), config.protobufRootMessage(), stepId);
                eventSender.send(WorkflowMessageType.RABBIT, WorkflowContentType.PROTOBUF,
                        config.producerName(), config.topic(), config.exchange(), config.routingKey(),
                        null, envelope.headers(), message);
            }
        }
    }
}
