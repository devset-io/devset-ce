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
 * Supported schema types for message serialization.
 */
public enum SchemaType {
    JSON("json"),
    PROTOBUF("protobuf");

    private final String externalName;

    SchemaType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link SchemaType} from its external name or enum name.
     *
     * @param value external name (e.g. {@code json}) or enum name; must not be blank
     * @return matching schema type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    @JsonCreator
    public static SchemaType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Schema type must not be blank");
        }
        for (SchemaType type : values()) {
            if (type.externalName.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported schema type: " + value);
    }

    /**
     * Resolves a {@link SchemaType} from its external name, or returns {@code null} when blank.
     *
     * @param value external name or enum name; may be {@code null} or blank
     * @return matching schema type, or {@code null} if the value is blank
     * @throws WorkflowEngineException if the value is non-blank and does not match any type
     */
    public static SchemaType fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return from(value);
    }

    /**
     * Returns the given type or {@link #JSON} when {@code null}.
     *
     * @param type the type to default; may be {@code null}
     * @return {@code type} if non-null, otherwise {@link #JSON}
     */
    public static SchemaType defaulted(SchemaType type) {
        return type == null ? JSON : type;
    }

    /**
     * Returns the stable external name used in JSON serialization.
     *
     * @return external name (e.g. {@code json}, {@code protobuf})
     */
    @JsonValue
    public String externalName() {
        return externalName;
    }
}
