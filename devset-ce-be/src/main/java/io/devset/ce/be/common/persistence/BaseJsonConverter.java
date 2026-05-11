/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import jakarta.persistence.AttributeConverter;

/**
 * Base JPA attribute converter for JSON serialization.
 * Subclasses provide the target type reference.
 *
 * @param <T> the Java type to convert to/from JSON
 */
public abstract class BaseJsonConverter<T> implements AttributeConverter<T, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Returns the Jackson type reference for deserialization.
     *
     * @return type reference describing the target type
     */
    protected abstract TypeReference<T> typeReference();

    @Override
    public String convertToDatabaseColumn(T attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new WorkflowEngineException("JSON write failed", e);
        }
    }

    @Override
    public T convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readValue(dbData, typeReference());
        } catch (JsonProcessingException e) {
            throw new WorkflowEngineException("JSON read failed", e);
        }
    }
}
