/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import io.devset.ce.be.common.persistence.BaseJsonConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for generic {@link Object} to JSON string.
 * Null values remain null in both directions.
 */
@Converter
public class ObjectJsonConverter extends BaseJsonConverter<Object> {

    private static final TypeReference<Object> OBJECT_TYPE = new TypeReference<>() {};

    @Override
    protected TypeReference<Object> typeReference() {
        return OBJECT_TYPE;
    }
}
