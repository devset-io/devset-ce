/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline.infrastructure;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;

/**
 * Immutable snapshot of workflow-level messaging properties needed during stage compilation.
 * <p>
 * Extracted from {@link Workflow} once at the start of compilation and threaded through
 * stage, emit and send config builders to avoid passing six individual parameters.
 *
 * @param messageType broker type (Kafka or RabbitMQ)
 * @param contentType serialization format (JSON or Protobuf)
 * @param producerName logical producer/connector name
 * @param topic        Kafka topic or RabbitMQ queue name; may be {@code null}
 * @param exchange     RabbitMQ exchange; may be {@code null}
 * @param routingKey   RabbitMQ routing key; may be {@code null}
 */
record WorkflowCompilationContext(
        WorkflowMessageType messageType,
        WorkflowContentType contentType,
        String producerName,
        String topic,
        String exchange,
        String routingKey
) {

    /** Creates a context from the given workflow definition. */
    static WorkflowCompilationContext from(Workflow workflow) {
        return new WorkflowCompilationContext(
                workflow.messageType(),
                workflow.contentType(),
                workflow.producerName(),
                workflow.topic(),
                workflow.exchange(),
                workflow.routingKey()
        );
    }

    /** Returns {@code true} if the broker type is RabbitMQ. */
    boolean isRabbit() {
        return messageType == WorkflowMessageType.RABBIT;
    }

    /** Returns {@code true} if the serialization format is Protobuf. */
    boolean isProtobuf() {
        return contentType == WorkflowContentType.PROTOBUF;
    }
}
