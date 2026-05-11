/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.helpers;

import io.devset.ce.be.common.domain.ExecutionStateKeys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Resolves value templates used by {@code set-field} steps.
 * <p>
 * A template is a map/list/scalar tree where two special single-key objects are
 * substituted: {@code {"$path": "..."}} resolves to a deep copy of the referenced
 * state value, and {@code {"$expression": "..."}} resolves to the result of
 * {@link SetFieldExpressionResolver#resolve}. Other values are recursively processed
 * or deep-copied.
 * <p>
 * When a {@code targetPath} is provided, each resolved map entry is immediately
 * written to state so that sibling fields later in the same map can reference it
 * via {@code $path} or {@code $expression}.
 */
@Component
@RequiredArgsConstructor
public final class SetFieldTemplateResolver {

    private static final String TEMPLATE_PATH = "$path";
    private static final String TEMPLATE_EXPRESSION = "$expression";
    private static final String WHEN = ExecutionStateKeys.DSL_WHEN;
    private static final String VALUE = ExecutionStateKeys.DSL_VALUE;
    private static final String DEFAULT = ExecutionStateKeys.DSL_DEFAULT;

    private final StateDataOps stateDataOps;
    private final SetFieldExpressionResolver expressionResolver;
    private final ConditionEvaluator conditionEvaluator;

    /**
     * Resolves a template value against the current runtime context.
     *
     * @param template template tree (map, list, {@code $path}, {@code $expression} or scalar)
     * @param context  runtime context used for path and expression resolution
     * @return the resolved concrete value
     */
    public Object resolve(Object template, ExecutionPlanRuntimeContext context) {
        return resolve(template, context, null);
    }

    /**
     * Resolves a template value, writing intermediate results to state when
     * {@code targetPath} is non-null so that sibling fields can reference
     * earlier entries in the same map.
     *
     * @param template   template tree (map, list, {@code $path}, {@code $expression} or scalar)
     * @param context    runtime context used for path and expression resolution
     * @param targetPath dot-path where the resolved map will be stored (e.g. {@code currentEvent.body}),
     *                   or {@code null} to skip intermediate writes
     * @return the resolved concrete value
     */
    public Object resolve(Object template, ExecutionPlanRuntimeContext context, String targetPath) {
        if (template instanceof Map<?, ?> templateMap) {
            if (templateMap.size() == 1 && templateMap.containsKey(TEMPLATE_PATH)) {
                return stateDataOps.deepCopyValue(context.state().get(String.valueOf(templateMap.get(TEMPLATE_PATH))));
            }
            if (templateMap.size() == 1 && templateMap.containsKey(TEMPLATE_EXPRESSION)) {
                return expressionResolver.resolve(String.valueOf(templateMap.get(TEMPLATE_EXPRESSION)), context, null);
            }
            if (templateMap.containsKey(WHEN) && templateMap.containsKey(VALUE)) {
                Map<String, Object> conditionMap = (Map<String, Object>) templateMap;
                boolean condition = conditionEvaluator.matches(conditionMap, WHEN, context, "template");
                return condition
                        ? resolve(templateMap.get(VALUE), context, targetPath)
                        : resolve(templateMap.getOrDefault(DEFAULT, null), context, targetPath);
            }

            Map<String, Object> resolvedMap = new java.util.LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : templateMap.entrySet()) {
                String key = String.valueOf(entry.getKey());
                String childPath = targetPath != null ? targetPath + "." + key : null;
                Object resolved = resolve(entry.getValue(), context, childPath);
                resolvedMap.put(key, resolved);
                if (targetPath != null) {
                    context.state().put(targetPath + "." + key, stateDataOps.deepCopyValue(resolved));
                }
            }
            return resolvedMap;
        }
        if (template instanceof List<?> templateList) {
            List<Object> resolvedList = new java.util.ArrayList<>();
            for (Object item : templateList) {
                resolvedList.add(resolve(item, context, null));
            }
            return resolvedList;
        }
        return stateDataOps.deepCopyValue(template);
    }

}
