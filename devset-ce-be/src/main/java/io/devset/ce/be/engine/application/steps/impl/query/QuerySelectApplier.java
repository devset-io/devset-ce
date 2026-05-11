/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl.query;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Applies the {@code select} mapping from an {@code execute-query} step:
 * reads fields from a MongoDB document and writes them to runtime state.
 * <p>
 * Supports short form ({@code "state.x": "fieldName"}) and full form
 * ({@code "state.x": {"field": "fieldName", "default": ...}}).
 * When no document is found, defaults are applied where configured.
 */
@Component
@RequiredArgsConstructor
public final class QuerySelectApplier {

    private static final String FIELD_KEY = "field";
    private static final String DEFAULT_KEY = "default";

    private final QueryFilterResolver filterResolver;

    /**
     * Applies select mappings to runtime state.
     *
     * @param selectConfig select configuration map
     * @param document     the matched document, or {@code null} if no match
     * @param context      runtime context for state writes and default resolution
     */
    public void apply(
            Map<String, Object> selectConfig,
            @Nullable Map<String, Object> document,
            ExecutionPlanRuntimeContext context
    ) {
        for (Map.Entry<String, Object> entry : selectConfig.entrySet()) {
            String statePath = entry.getKey();
            Object selectValue = entry.getValue();
            String fieldName = extractFieldName(selectValue);

            if (document != null) {
                context.state().put(statePath, readNestedField(document, fieldName));
            } else if (selectValue instanceof Map<?, ?> selectMap && selectMap.containsKey(DEFAULT_KEY)) {
                Object defaultValue = filterResolver.resolveDefaultValue(selectMap.get(DEFAULT_KEY), context);
                context.state().put(statePath, defaultValue);
            } else {
                throw new WorkflowEngineException(
                        "Query returned no documents. State path '" + statePath
                                + "' was not populated. Configure a default value in the select mapping"
                                + " to handle empty results, e.g.: {\"field\": \"" + fieldName + "\", \"default\": null}"
                );
            }
        }
    }

    /**
     * Extracts the MongoDB field name from a select value.
     *
     * @param selectValue string field name or map with {@code field} key
     * @return the field name
     */
    static String extractFieldName(Object selectValue) {
        if (selectValue instanceof String fieldName) {
            return fieldName;
        }
        if (selectValue instanceof Map<?, ?> selectMap) {
            Object field = selectMap.get(FIELD_KEY);
            if (field == null) {
                throw new WorkflowEngineException("select entry must have 'field' key");
            }
            return String.valueOf(field);
        }
        throw new WorkflowEngineException("select value must be a string or object with 'field'");
    }

    private Object readNestedField(Map<String, Object> document, String fieldPath) {
        String[] parts = fieldPath.split("\\.");
        Object current = document;
        for (String part : parts) {
            if (!(current instanceof Map<?, ?> currentMap)) {
                return null;
            }
            current = currentMap.get(part);
        }
        return current;
    }
}
