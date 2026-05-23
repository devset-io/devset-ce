/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline.infrastructure;

import io.devset.ce.be.common.domain.DomainValidation;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Compiles DSL value forms into the {@code Map<String,Object>} config shape consumed
 * by {@code SetFieldStepHandler} and related handlers.
 * <p>
 * Covers:
 * <ul>
 *   <li>{@code set} / {@code state} assignment blocks → {@code SET_FIELD} steps</li>
 *   <li>Four value forms: literal / {@code $ref} path / {@code $fn} expression / nested template</li>
 *   <li>Conditional {@code when} guards with {@code default} fallbacks</li>
 *   <li>Function condition maps ({@code $fn}) used by {@code emit}, {@code repeatWhile}, {@code repeatUntil}</li>
 * </ul>
 * <p>
 * {@code $ref} resolution rules: a reference starting with one of the absolute
 * state roots ({@code state.}, {@code currentEvent.}, {@code lastAppendedEvent.},
 * {@code context.}, {@code meta.}) is treated as an absolute state path;
 * otherwise the {@code currentEvent.} prefix is added automatically (the common
 * case in {@code set} where references point to sibling fields of the event
 * payload). The whitelist must stay in sync with
 * {@code ExpressionParser.isStatePath}.
 */
@Component
final class PipelineValueCompiler {

    static final String TARGET_PATH = "targetPath";
    static final String VALUE = "value";
    static final String VALUE_PATH = "valuePath";
    static final String VALUE_TEMPLATE = "valueTemplate";
    static final String VALUE_EXPRESSION = "valueExpression";
    static final String DEFAULT = ExecutionStateKeys.DSL_DEFAULT;
    static final String DEFAULT_VALUE = "defaultValue";
    static final String DEFAULT_VALUE_PATH = "defaultValuePath";
    static final String DEFAULT_VALUE_TEMPLATE = "defaultValueTemplate";
    static final String DEFAULT_VALUE_EXPRESSION = "defaultValueExpression";
    static final String WHEN = ExecutionStateKeys.DSL_WHEN;
    static final String FUNCTION = "$fn";
    static final String REFERENCE = "$ref";
    static final String PATH = "$path";
    static final String CURRENT_EVENT_ROOT = ExecutionStateKeys.CURRENT_EVENT;
    static final String STATE_ROOT = "state";

    /**
     * Reference prefixes treated as absolute state paths — kept in sync with
     * {@code ExpressionParser.isStatePath} on the runtime side.
     */
    private static final Set<String> ABSOLUTE_REF_PREFIXES = Set.of(
            STATE_ROOT + ".",
            CURRENT_EVENT_ROOT + ".",
            ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX,
            "context.",
            ExecutionStateKeys.META_PREFIX
    );

    // ── assignments ──────────────────────────────────────────────────────────

    /**
     * Compiles a single value assignment targeting the given path.
     *
     * @param stepId    step identifier
     * @param target    full target path (e.g. {@code currentEventKey})
     * @param rawValue  DSL value (literal, {@code $ref}, {@code $fn}, or template)
     * @param stageName stage name for the generated step
     * @return compiled set-field step definition
     */
    ExecutionPlanDefinition.ExecutionStepDefinition compileSingleAssignment(
            String stepId, String target, Object rawValue, String stageName
    ) {
        LinkedHashMap<String, Object> config = new LinkedHashMap<>();
        config.put(TARGET_PATH, target);
        compileConfiguredAssignment(config, rawValue, stepId, "key");
        return new ExecutionPlanDefinition.ExecutionStepDefinition(stepId, StepType.SET_FIELD, config, stageName);
    }

    List<ExecutionPlanDefinition.ExecutionStepDefinition> compileAssignmentSteps(
            String prefix,
            Map<String, Object> values,
            String targetRoot,
            String stageName
    ) {
        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>();
        int index = 1;
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            LinkedHashMap<String, Object> config = new LinkedHashMap<>();
            config.put(TARGET_PATH, targetRoot + "." + entry.getKey());
            compileConfiguredAssignment(config, entry.getValue(), prefix, entry.getKey());
            steps.add(new ExecutionPlanDefinition.ExecutionStepDefinition(
                    prefix + "-set-" + index, StepType.SET_FIELD, config, stageName));
            index++;
        }
        return steps;
    }

    Map<String, Object> compileTemplateMap(Map<String, Object> value) {
        LinkedHashMap<String, Object> compiled = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : value.entrySet()) {
            compiled.put(entry.getKey(), compileTemplateValue(entry.getValue()));
        }
        return compiled;
    }

    // ── conditions ───────────────────────────────────────────────────────────

    Map<String, Object> compileWhen(Object rawWhen, String prefix, String fieldName) {
        if (!(rawWhen instanceof Map<?, ?> rawWhenMap)) {
            throw new WorkflowEngineException("when must be an object for set field: " + prefix + "." + fieldName);
        }
        if (rawWhenMap.size() != 1 || !rawWhenMap.containsKey(FUNCTION)) {
            throw new WorkflowEngineException("when must use '$fn' for set field: " + prefix + "." + fieldName);
        }
        return Map.of(FUNCTION, compileFunctionExpression(rawWhenMap.get(FUNCTION)));
    }

    Map<String, Object> compileEmitCondition(Object emit, String stageName) {
        if (!(emit instanceof Map<?, ?> emitMap)) {
            return null;
        }
        return compileConditionMap(emitMap, stageName, "emit");
    }

    Map<String, Object> compileConditionMap(Map<?, ?> rawConditionMap, String stageName, String fieldName) {
        if (rawConditionMap.size() != 1 || !rawConditionMap.containsKey(FUNCTION)) {
            throw new WorkflowEngineException(fieldName + " must use '$fn' for stage: " + stageName);
        }
        return Map.of(FUNCTION, compileFunctionExpression(rawConditionMap.get(FUNCTION)));
    }

    boolean shouldEmit(Object emit) {
        if (emit == null) {
            return false;
        }
        if (emit instanceof Boolean booleanEmit) {
            return booleanEmit;
        }
        if (emit instanceof Map<?, ?>) {
            return true;
        }
        throw new WorkflowEngineException("emit must be boolean or object");
    }

    String compileFunctionExpression(Object functionName) {
        return DomainValidation.requireText(
                functionName == null ? null : String.valueOf(functionName),
                "function name"
        );
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void compileConfiguredAssignment(
            Map<String, Object> config,
            Object rawValue,
            String prefix,
            String fieldName
    ) {
        if (rawValue instanceof Map<?, ?> rawValueMap && isConditionalSetValue(rawValueMap)) {
            config.put(WHEN, compileWhen(rawValueMap.get(WHEN), prefix, fieldName));
            compileConfiguredValue(config, rawValueMap.get(VALUE), VALUE, VALUE_PATH, VALUE_TEMPLATE, VALUE_EXPRESSION);
            if (rawValueMap.containsKey(DEFAULT)) {
                compileConfiguredValue(config, rawValueMap.get(DEFAULT),
                        DEFAULT_VALUE, DEFAULT_VALUE_PATH, DEFAULT_VALUE_TEMPLATE, DEFAULT_VALUE_EXPRESSION);
            }
            return;
        }
        compileConfiguredValue(config, rawValue, VALUE, VALUE_PATH, VALUE_TEMPLATE, VALUE_EXPRESSION);
    }

    private void compileConfiguredValue(
            Map<String, Object> config,
            Object value,
            String literalKey,
            String pathKey,
            String templateKey,
            String expressionKey
    ) {
        if (value instanceof Map<?, ?> valueMap && isReferenceOrFunctionMap(valueMap)) {
            if (valueMap.containsKey(FUNCTION)) {
                config.put(expressionKey, compileFunctionExpression(valueMap.get(FUNCTION)));
            } else {
                config.put(pathKey, compileReferencePath(valueMap.get(REFERENCE)));
            }
            return;
        }
        if (value instanceof Map<?, ?> || value instanceof List<?>) {
            config.put(templateKey, compileTemplateValue(value));
            return;
        }
        config.put(literalKey, value);
    }

    private Object compileTemplateValue(Object value) {
        if (value instanceof Map<?, ?> valueMap) {
            if (isReferenceOrFunctionMap(valueMap)) {
                if (valueMap.containsKey(FUNCTION)) {
                    return Map.of("$expression", compileFunctionExpression(valueMap.get(FUNCTION)));
                }
                return Map.of(PATH, compileReferencePath(valueMap.get(REFERENCE)));
            }
            LinkedHashMap<String, Object> compiled = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : valueMap.entrySet()) {
                compiled.put(String.valueOf(entry.getKey()), compileTemplateValue(entry.getValue()));
            }
            return compiled;
        }
        if (value instanceof List<?> valueList) {
            List<Object> compiled = new ArrayList<>();
            for (Object item : valueList) {
                compiled.add(compileTemplateValue(item));
            }
            return compiled;
        }
        return value;
    }

    private String compileReferencePath(Object referenceName) {
        String normalized = DomainValidation.requireText(
                referenceName == null ? null : String.valueOf(referenceName),
                "reference"
        );
        for (String prefix : ABSOLUTE_REF_PREFIXES) {
            if (normalized.startsWith(prefix)) {
                return normalized;
            }
        }
        return CURRENT_EVENT_ROOT + "." + normalized;
    }

    private boolean isReferenceOrFunctionMap(Map<?, ?> valueMap) {
        return valueMap.size() == 1 && (valueMap.containsKey(FUNCTION) || valueMap.containsKey(REFERENCE));
    }

    private boolean isConditionalSetValue(Map<?, ?> valueMap) {
        return valueMap.containsKey(WHEN) && valueMap.containsKey(VALUE);
    }
}
