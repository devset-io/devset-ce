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

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Resolves a {@link SendConfig} from an {@code execute-send} step definition.
 * <p>
 * Validates Kafka topic presence and normalizes RabbitMQ routing (queue name,
 * exchange, routing key) using {@link #resolveRabbitDestination}.
 */
@Component
@RequiredArgsConstructor
public final class SendTargetResolver {

    private static final String DEFAULT_SOURCE_PATH = ExecutionStateKeys.LAST_APPENDED_EVENT;
    private static final String PRODUCER_NAME = "producerName";
    private static final String TOPIC = "topic";
    private static final String EXCHANGE = "exchange";
    private static final String ROUTING_KEY = "routingKey";

    private final StepSupport stepSupport;

    /**
     * Resolves and validates the send configuration from the step definition.
     *
     * @param step the step definition containing broker/routing configuration
     * @return fully resolved {@link SendConfig}
     * @throws WorkflowEngineException if required routing config is missing or invalid
     */
    public SendConfig resolve(ExecutionPlanDefinition.ExecutionStepDefinition step) {
        WorkflowMessageType messageType = WorkflowMessageType.from(
                String.valueOf(step.config().getOrDefault(ExecutionPlanStepHandler.MESSAGE_TYPE, WorkflowMessageType.KAFKA.externalName())));
        WorkflowContentType contentType = WorkflowContentType.from(
                String.valueOf(step.config().getOrDefault(ExecutionPlanStepHandler.CONTENT_TYPE, WorkflowContentType.JSON.externalName())));
        String producerName = stepSupport.stringConfig(step, PRODUCER_NAME);
        String topic = StepSupport.optionalString(step.config().get(TOPIC));
        String exchange = StepSupport.optionalString(step.config().get(EXCHANGE));
        String routingKey = StepSupport.optionalString(step.config().get(ROUTING_KEY));

        if (messageType == WorkflowMessageType.KAFKA && topic == null) {
            throw new WorkflowEngineException("Missing config 'topic' for step: " + step.id());
        }
        if (messageType == WorkflowMessageType.RABBIT) {
            RabbitDestination dest = resolveRabbitDestination(topic, exchange, routingKey, step.id());
            topic = dest.queueName();
            exchange = dest.exchange();
            routingKey = dest.routingKey();
        }

        return new SendConfig(
                messageType,
                contentType,
                producerName,
                topic,
                exchange,
                routingKey,
                StepSupport.optionalString(step.config().get(ExecutionPlanStepHandler.SCHEMA_DESCRIPTOR)),
                StepSupport.optionalString(step.config().get(ExecutionPlanStepHandler.PROTOBUF_ROOT_MESSAGE)),
                String.valueOf(step.config().getOrDefault(ExecutionPlanStepHandler.SOURCE_PATH, DEFAULT_SOURCE_PATH))
        );
    }

    private RabbitDestination resolveRabbitDestination(
            @Nullable String topic,
            @Nullable String exchange,
            @Nullable String routingKey,
            String stepId
    ) {
        if (routingKey != null) {
            return new RabbitDestination(null, exchange, routingKey);
        }
        if (topic != null) {
            if (exchange != null) {
                return new RabbitDestination(null, exchange, topic);
            }
            return new RabbitDestination(topic, exchange, null);
        }
        if (exchange != null) {
            return new RabbitDestination(null, exchange, "");
        }
        throw new WorkflowEngineException("Rabbit send requires topic (queue), routingKey or exchange for step: " + stepId);
    }

    private record RabbitDestination(
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey
    ) {}
}
