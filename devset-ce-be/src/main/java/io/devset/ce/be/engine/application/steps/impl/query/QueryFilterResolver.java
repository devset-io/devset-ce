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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.SetFieldExpressionResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves {@code find} filter maps for {@code execute-query} steps.
 * <p>
 * Values containing {@code {"$path": "...", "default": ...}} are resolved
 * from runtime state with fallback. Values containing {@code {"$fn": "..."}}
 * are evaluated as DSL expressions (e.g. {@code int(1,200)}, {@code uuid()}).
 * MongoDB operators ({@code $gt}, {@code $lt}, etc.) pass through unchanged.
 */
@Component
@RequiredArgsConstructor
public final class QueryFilterResolver {

    private static final String PATH_KEY = "$path";
    private static final String EXPRESSION_KEY = "$fn";
    private static final String DEFAULT_KEY = "default";

    private final ObjectMapper objectMapper;
    private final SetFieldExpressionResolver expressionResolver;

    /**
     * Resolves the filter map and serializes it to JSON.
     *
     * @param findConfig filter configuration from step config
     * @param context    runtime context for state lookups
     * @param stepId     step identifier for error messages
     * @return JSON string representing the resolved filter
     */
    public String resolve(Map<String, Object> findConfig, ExecutionPlanRuntimeContext context, String stepId) {
        if (findConfig.isEmpty()) {
            return "{}";
        }
        Map<String, Object> resolved = resolveMap(findConfig, context, stepId);
        try {
            return objectMapper.writeValueAsString(resolved);
        } catch (JsonProcessingException e) {
            throw new WorkflowEngineException("Failed to serialize resolved filter for step: " + stepId, e);
        }
    }

    private Map<String, Object> resolveMap(Map<String, Object> map, ExecutionPlanRuntimeContext context, String stepId) {
        LinkedHashMap<String, Object> resolved = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            resolved.put(entry.getKey(), resolveValue(entry.getValue(), context, stepId));
        }
        return resolved;
    }

    private Object resolveValue(Object value, ExecutionPlanRuntimeContext context, String stepId) {
        if (value instanceof List<?> list) {
            List<Object> resolvedList = new ArrayList<>(list.size());
            for (Object element : list) {
                resolvedList.add(resolveValue(element, context, stepId));
            }
            return resolvedList;
        }
        if (!(value instanceof Map<?, ?> valueMap)) {
            return value;
        }
        if (valueMap.containsKey(PATH_KEY)) {
            String path = String.valueOf(valueMap.get(PATH_KEY));
            Object resolved = context.state().getOrDefault(path, null);
            if (resolved != null) {
                return resolved;
            }
            Object defaultValue = valueMap.get(DEFAULT_KEY);
            if (defaultValue == null) {
                return null;
            }
            return resolveDefaultValue(defaultValue, context);
        }
        if (valueMap.containsKey(EXPRESSION_KEY)) {
            return expressionResolver.resolve(
                    String.valueOf(valueMap.get(EXPRESSION_KEY)), context, stepId
            );
        }
        LinkedHashMap<String, Object> resolvedMap = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : valueMap.entrySet()) {
            resolvedMap.put(String.valueOf(entry.getKey()), resolveValue(entry.getValue(), context, stepId));
        }
        return resolvedMap;
    }

    /**
     * Resolves a default value. If the default is itself a {@code {"$path": "..."}} map,
     * it is resolved from state. Otherwise returned as-is.
     *
     * @param defaultValue the raw default value
     * @param context      runtime context for state lookups
     * @return resolved default value
     */
    public Object resolveDefaultValue(Object defaultValue, ExecutionPlanRuntimeContext context) {
        if (defaultValue instanceof Map<?, ?> defaultMap && defaultMap.containsKey(PATH_KEY)) {
            return context.state().getOrDefault(String.valueOf(defaultMap.get(PATH_KEY)), null);
        }
        return defaultValue;
    }
}
