/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.persistence.BaseJsonConverter;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * JPA converter for {@code List<Stage>} to JSON string.
 * Null lists are serialized as empty lists.
 */
@Converter
public class WorkflowStageListJsonConverter extends BaseJsonConverter<List<Stage>> {

    private static final TypeReference<List<Stage>> LIST_TYPE = new TypeReference<>() {};

    @Override
    protected TypeReference<List<Stage>> typeReference() {
        return LIST_TYPE;
    }

    /**
     * Serializes the stage list to its JSON database representation.
     * {@code null} lists are normalized to an empty list before serialization.
     *
     * @param attribute the stage list, may be {@code null}
     * @return JSON string stored in the database
     */
    @Override
    public String convertToDatabaseColumn(List<Stage> attribute) {
        return super.convertToDatabaseColumn(attribute == null ? List.of() : attribute);
    }

    /**
     * Deserializes the JSON database value into a stage list.
     * Null or blank database values are returned as an empty list.
     *
     * @param dbData JSON string from the database
     * @return stage list, never {@code null}
     */
    @Override
    public List<Stage> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        return super.convertToEntityAttribute(dbData);
    }
}
