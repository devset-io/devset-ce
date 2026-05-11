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
 * Supported database connector types managed by the {@code db/connectors}
 * endpoints. Kept separate from {@link ConnectionType}, which only covers
 * messaging connectors (Kafka, Rabbit), so that switches over either enum
 * remain exhaustive.
 */
public enum DbConnectionType {
    MONGODB("mongodb");

    private final String externalName;

    DbConnectionType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link DbConnectionType} from its external name or enum name.
     *
     * @param value external name (e.g. {@code mongodb}) or enum name; must not be blank
     * @return matching db connection type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    @JsonCreator
    public static DbConnectionType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Database connection type must not be blank");
        }
        for (DbConnectionType type : values()) {
            if (type.externalName.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported database connection type: " + value);
    }

    /**
     * Returns the stable external name used in JSON serialization.
     *
     * @return external name (e.g. {@code mongodb})
     */
    @JsonValue
    public String externalName() {
        return externalName;
    }
}
