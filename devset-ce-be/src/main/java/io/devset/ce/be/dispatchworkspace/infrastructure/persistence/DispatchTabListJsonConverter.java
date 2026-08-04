/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import io.devset.ce.be.common.persistence.BaseJsonConverter;
import io.devset.ce.be.dispatchworkspace.domain.DispatchTab;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * JPA converter for {@code List<DispatchTab>} to a JSON string.
 * Null lists are serialized as an empty array; deserialization of a blank column yields an empty list.
 */
@Converter
public class DispatchTabListJsonConverter extends BaseJsonConverter<List<DispatchTab>> {

    private static final TypeReference<List<DispatchTab>> LIST_TYPE = new TypeReference<>() {};

    @Override
    protected TypeReference<List<DispatchTab>> typeReference() {
        return LIST_TYPE;
    }

    @Override
    public String convertToDatabaseColumn(List<DispatchTab> attribute) {
        return super.convertToDatabaseColumn(attribute == null ? List.of() : attribute);
    }

    @Override
    public List<DispatchTab> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        return super.convertToEntityAttribute(dbData);
    }
}