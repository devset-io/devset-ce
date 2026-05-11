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
 * Supported content types for workflow payload serialization.
 * Controls how the engine serializes outgoing messages.
 */
public enum WorkflowContentType {
    JSON("application/json"),
    PROTOBUF("application/x-protobuf");

    private final String externalName;

    WorkflowContentType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link WorkflowContentType} from its media type or enum name.
     *
     * @param value media type (e.g. {@code application/json}) or enum name; must not be blank
     * @return matching content type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    @JsonCreator
    public static WorkflowContentType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Workflow contentType must not be blank");
        }
        for (WorkflowContentType type : values()) {
            if (type.externalName.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported workflow contentType: " + value);
    }

    /**
     * Resolves a {@link WorkflowContentType} from its media type, or returns {@code null}
     * when the value is blank.
     *
     * @param value media type or enum name; may be {@code null} or blank
     * @return matching content type, or {@code null} if the value is blank
     * @throws WorkflowEngineException if the value is non-blank and does not match any type
     */
    public static WorkflowContentType fromNullable(String value) {
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
    public static WorkflowContentType defaulted(WorkflowContentType type) {
        return type == null ? JSON : type;
    }

    /**
     * Returns the stable external media type used in JSON serialization.
     *
     * @return media type (e.g. {@code application/json})
     */
    @JsonValue
    public String externalName() {
        return externalName;
    }
}
