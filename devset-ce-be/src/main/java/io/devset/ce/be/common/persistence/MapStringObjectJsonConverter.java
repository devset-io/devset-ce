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

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.Converter;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * JPA converter for {@code Map<String, Object>} to JSON string.
 * Null maps are serialized as empty maps; deserialized results are wrapped in {@link LinkedHashMap}.
 */
@Converter
public class MapStringObjectJsonConverter extends BaseJsonConverter<Map<String, Object>> {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    @Override
    protected TypeReference<Map<String, Object>> typeReference() {
        return MAP_TYPE;
    }

    @Override
    public String convertToDatabaseColumn(Map<String, Object> attribute) {
        return super.convertToDatabaseColumn(attribute == null ? Map.of() : attribute);
    }

    @Override
    public Map<String, Object> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return Map.of();
        }
        return new LinkedHashMap<>(super.convertToEntityAttribute(dbData));
    }
}
