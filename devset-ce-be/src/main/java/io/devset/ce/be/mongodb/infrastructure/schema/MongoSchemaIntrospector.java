/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.infrastructure.schema;

import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaFieldDto;
import org.bson.Document;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Builds a field schema tree from a MongoDB {@link Document} sample.
 * <p>
 * Pure logic — no Mongo client dependency. Recursively walks the document
 * structure and produces a list of {@link MongoDbSchemaFieldDto} with
 * dot-notation paths, BSON type names, and nested children.
 */
@Component
public class MongoSchemaIntrospector {

    /**
     * Builds a schema from a sample document.
     *
     * @param sample the document to introspect
     * @return list of top-level fields with nested children
     */
    public List<MongoDbSchemaFieldDto> buildSchema(Document sample) {
        return buildFields(sample, "");
    }

    private List<MongoDbSchemaFieldDto> buildFields(Document document, String prefix) {
        List<MongoDbSchemaFieldDto> fields = new ArrayList<>();
        for (Map.Entry<String, Object> entry : document.entrySet()) {
            String fieldName = entry.getKey();
            String path = prefix.isEmpty() ? fieldName : prefix + "." + fieldName;
            Object value = entry.getValue();

            String type = resolveTypeName(value);
            List<MongoDbSchemaFieldDto> children = List.of();

            if (value instanceof Document nested) {
                children = buildFields(nested, path);
            }

            fields.add(new MongoDbSchemaFieldDto(path, type, children));
        }
        return fields;
    }

    private String resolveTypeName(Object value) {
        if (value == null) return "Null";
        if (value instanceof String) return "String";
        if (value instanceof Integer) return "Integer";
        if (value instanceof Long) return "Long";
        if (value instanceof Double) return "Double";
        if (value instanceof Boolean) return "Boolean";
        if (value instanceof java.util.Date) return "Date";
        if (value instanceof org.bson.types.ObjectId) return "ObjectId";
        if (value instanceof List<?>) return "Array";
        if (value instanceof Document) return "Document";
        return value.getClass().getSimpleName();
    }
}
