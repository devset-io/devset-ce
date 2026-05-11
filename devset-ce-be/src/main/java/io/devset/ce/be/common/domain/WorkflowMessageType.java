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

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Supported target broker types for workflow execution.
 * Selects whether the engine dispatches through Kafka or RabbitMQ.
 */
public enum WorkflowMessageType {
    KAFKA("kafka"),
    RABBIT("rabbit");

    private final String externalName;

    WorkflowMessageType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link WorkflowMessageType} from its external name or enum name.
     *
     * @param value external name (e.g. {@code kafka}) or enum name; must not be blank
     * @return matching message type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    @JsonCreator
    public static WorkflowMessageType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Workflow messageType must not be blank");
        }
        for (WorkflowMessageType type : values()) {
            if (type.externalName.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported workflow messageType: " + value);
    }

    /**
     * Resolves a {@link WorkflowMessageType} from its external name, or returns {@code null}
     * when the value is blank.
     *
     * @param value external name or enum name; may be {@code null} or blank
     * @return matching message type, or {@code null} if the value is blank
     * @throws WorkflowEngineException if the value is non-blank and does not match any type
     */
    public static WorkflowMessageType fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return from(value);
    }

    /**
     * Returns the given type or {@link #KAFKA} when {@code null}.
     *
     * @param type the type to default; may be {@code null}
     * @return {@code type} if non-null, otherwise {@link #KAFKA}
     */
    public static WorkflowMessageType defaulted(WorkflowMessageType type) {
        return type == null ? KAFKA : type;
    }

    /**
     * Returns the stable external name used in JSON serialization.
     *
     * @return external name (e.g. {@code kafka}, {@code rabbit})
     */
    @JsonValue
    public String externalName() {
        return externalName;
    }
}
