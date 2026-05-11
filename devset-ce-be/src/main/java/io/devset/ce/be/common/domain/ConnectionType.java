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
 * Supported broker connector types used by the engine.
 * Identifies which messaging adapter a connector targets.
 */
public enum ConnectionType {
    KAFKA("kafka"),
    RABBIT("rabbit");

    private final String externalName;

    ConnectionType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link ConnectionType} from its external name or enum name.
     *
     * @param value external name (e.g. {@code kafka}) or enum name; must not be blank
     * @return matching connection type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    @JsonCreator
    public static ConnectionType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Connection type must not be blank");
        }
        for (ConnectionType type : values()) {
            if (type.externalName.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported connection type: " + value);
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
