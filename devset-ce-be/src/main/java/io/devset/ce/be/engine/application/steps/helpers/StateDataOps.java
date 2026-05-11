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

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Shared state manipulation primitives used by step handlers.
 * <p>
 * Three groups of responsibility:
 * <ul>
 *   <li><b>Deep copy</b> — {@link #deepCopyValue}/{@link #deepCopyMap}: recursively copy
 *       {@code Map}/{@code List}/scalar values so step handlers work on isolated snapshots.</li>
 *   <li><b>Field copy</b> — {@link #copyField}: implements {@code copy-field} step semantics:
 *       full copy to a target path, selected-field copy, or merge into {@code currentEvent}.</li>
 *   <li><b>Merge</b> — {@code mergeMap} (private): deep-merges a source map into a target map,
 *       respecting an {@code excludePaths} set to skip specific fields.</li>
 * </ul>
 */
@Component
public final class StateDataOps {

    private static final String FIELDS = "fields";
    private static final String SOURCE_PATH = "sourcePath";
    private static final String TARGET_PATH = "targetPath";
    private static final String TARGET_BASE_PATH = "targetBasePath";
    private static final String EXCLUDE_PATHS = "excludePaths";
    private static final String DEFAULT_TARGET_BASE_PATH = ExecutionStateKeys.CURRENT_EVENT;
    private static final String COPY_FIELD_WITH_FIELDS_REQUIRES_FIELDS_LIST = "copy-field with fields requires fields list";
    private static final String CURRENT_EVENT_MUST_BE_AN_OBJECT = "currentEvent must be an object";
    private static final String EXCLUDE_PATHS_MUST_BE_A_LIST = "excludePaths must be a list";

    // --- deep copy ---

    /**
     * Creates a deep copy of supported JSON-like values ({@code Map}/{@code List}/scalar).
     *
     * @param value value to copy; scalars are returned as-is
     * @return a deep copy of the value
     * @throws WorkflowEngineException if the current thread has been interrupted
     */
    public Object deepCopyValue(Object value) {
        ensureNotInterrupted();
        if (value instanceof Map<?, ?> mapValue) {
            Map<String, Object> copy = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : mapValue.entrySet()) {
                ensureNotInterrupted();
                copy.put(String.valueOf(entry.getKey()), deepCopyValue(entry.getValue()));
            }
            return copy;
        }
        if (value instanceof List<?> listValue) {
            List<Object> copy = new ArrayList<>();
            for (Object item : listValue) {
                ensureNotInterrupted();
                copy.add(deepCopyValue(item));
            }
            return copy;
        }
        return value;
    }

    /**
     * Deep-copy wrapper for map values used as runtime state/context payload.
     *
     * @param source source map
     * @return deep copy of the map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> deepCopyMap(Map<String, Object> source) {
        return (Map<String, Object>) deepCopyValue(source);
    }

    // --- field copy ---

    /**
     * Executes copy-field semantics against the given state.
     * <p>
     * Performs either a full copy, a selected-field copy, or a merge into
     * {@code currentEvent}, depending on the step configuration.
     *
     * @param step          step definition carrying the copy configuration
     * @param workflowState mutable runtime state
     * @throws WorkflowEngineException on missing or malformed configuration
     */
    public void copyField(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanState workflowState) {
        ensureNotInterrupted();
        if (step.config().containsKey(FIELDS)) {
            copySelectedFields(step, workflowState);
            return;
        }

        String sourcePath = stringConfig(step, SOURCE_PATH);
        Object sourceValue = workflowState.get(sourcePath);
        if (!step.config().containsKey(TARGET_PATH) && sourceValue instanceof Map<?, ?> sourceMap) {
            mergeIntoCurrentEvent(sourcePath, sourceMap, step, workflowState);
            return;
        }

        String targetPath = resolveCopyTargetPath(step, sourcePath);
        workflowState.put(targetPath, deepCopyValue(sourceValue));
    }

    private void copySelectedFields(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanState workflowState) {
        String sourcePath = stringConfig(step, SOURCE_PATH);
        String targetBasePath = String.valueOf(step.config().getOrDefault(TARGET_BASE_PATH, DEFAULT_TARGET_BASE_PATH));
        Object rawFields = step.config().get(FIELDS);
        if (!(rawFields instanceof List<?> fieldList)) {
            throw new WorkflowEngineException(COPY_FIELD_WITH_FIELDS_REQUIRES_FIELDS_LIST);
        }

        for (Object rawField : fieldList) {
            ensureNotInterrupted();
            String fieldPath = String.valueOf(rawField);
            Object value = workflowState.get(sourcePath + "." + fieldPath);
            workflowState.put(targetBasePath + "." + fieldPath, deepCopyValue(value));
        }
    }

    private String resolveCopyTargetPath(ExecutionPlanDefinition.ExecutionStepDefinition step, String sourcePath) {
        Object targetPath = step.config().get(TARGET_PATH);
        if (targetPath != null) {
            return String.valueOf(targetPath);
        }

        int lastSeparatorIndex = sourcePath.lastIndexOf('.');
        String fieldName = lastSeparatorIndex >= 0
                ? sourcePath.substring(lastSeparatorIndex + 1)
                : sourcePath;
        if (fieldName.isBlank()) {
            throw new WorkflowEngineException("Unable to infer targetPath for step: " + step.id());
        }
        return ExecutionStateKeys.CURRENT_EVENT_PREFIX + fieldName;
    }

    @SuppressWarnings("unchecked")
    private void mergeIntoCurrentEvent(
            String sourcePath,
            Map<?, ?> sourceMap,
            ExecutionPlanDefinition.ExecutionStepDefinition step,
            ExecutionPlanState workflowState
    ) {
        Object currentEvent = workflowState.get(ExecutionStateKeys.CURRENT_EVENT);
        if (!(currentEvent instanceof Map<?, ?> currentEventMap)) {
            throw new WorkflowEngineException(CURRENT_EVENT_MUST_BE_AN_OBJECT);
        }

        Map<String, Object> mergedEvent = (Map<String, Object>) deepCopyValue((Map<String, Object>) currentEventMap);
        mergeMap(sourcePath, sourceMap, mergedEvent, excludedPaths(step));
        workflowState.put(ExecutionStateKeys.CURRENT_EVENT, mergedEvent);
    }

    // --- merge ---

    /**
     * Recursively merges {@code sourceMap} into {@code targetMap}, skipping keys absent from
     * target and paths listed in {@code excludedPaths}.
     * <p>
     * Only keys that already exist in {@code targetMap} are updated — this is a selective merge,
     * not a union. Nested maps are merged recursively unless they have no excluded descendants,
     * in which case the whole subtree is deep-copied as a unit.
     * <p>
     * Example:
     * <pre>
     *   source = {a: {x: 1, y: 2}, b: 99}
     *   target = {a: {x: 0,      }, c: 7}
     *   result = {a: {x: 1,      }, c: 7}   // b skipped (not in target), y skipped (not in target)
     * </pre>
     *
     * @param currentSourcePath dot-path prefix for the current source level (used for excludedPaths matching)
     * @param sourceMap         source map to merge from
     * @param targetMap         target map to merge into (mutated in place)
     * @param excludedPaths     set of full dot-paths to skip during merge
     */
    private void mergeMap(String currentSourcePath, Map<?, ?> sourceMap, Map<String, Object> targetMap, Set<String> excludedPaths) {
        for (Map.Entry<?, ?> entry : sourceMap.entrySet()) {
            ensureNotInterrupted();
            String entryKey = String.valueOf(entry.getKey());
            String entryPath = currentSourcePath + "." + entryKey;
            if (!targetMap.containsKey(entryKey)) {
                continue;
            }
            if (excludedPaths.contains(entryPath)) {
                continue;
            }

            Object value = entry.getValue();
            if (value instanceof Map<?, ?> nestedMap && !hasExcludedDescendants(entryPath, excludedPaths)) {
                targetMap.put(entryKey, deepCopyValue(value));
                continue;
            }
            if (value instanceof Map<?, ?> nestedMap) {
                Map<String, Object> nestedTarget = nestedTargetMap(targetMap, entryKey);
                mergeMap(entryPath, nestedMap, nestedTarget, excludedPaths);
                continue;
            }
            targetMap.put(entryKey, deepCopyValue(value));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> nestedTargetMap(Map<String, Object> targetMap, String entryKey) {
        Object existingValue = targetMap.get(entryKey);
        if (existingValue == null) {
            LinkedHashMap<String, Object> nestedTarget = new LinkedHashMap<>();
            targetMap.put(entryKey, nestedTarget);
            return nestedTarget;
        }
        if (!(existingValue instanceof Map<?, ?> existingMap)) {
            throw new WorkflowEngineException("Cannot merge object into non-object field: currentEvent." + entryKey);
        }
        return (Map<String, Object>) existingMap;
    }

    private boolean hasExcludedDescendants(String entryPath, Set<String> excludedPaths) {
        String nestedPrefix = entryPath + ".";
        for (String excludedPath : excludedPaths) {
            ensureNotInterrupted();
            if (excludedPath.startsWith(nestedPrefix)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> excludedPaths(ExecutionPlanDefinition.ExecutionStepDefinition step) {
        Object rawExcludedPaths = step.config().get(EXCLUDE_PATHS);
        if (rawExcludedPaths == null) {
            return Set.of();
        }
        if (!(rawExcludedPaths instanceof List<?> rawExcludedPathList)) {
            throw new WorkflowEngineException(EXCLUDE_PATHS_MUST_BE_A_LIST);
        }

        Set<String> excludedPaths = new HashSet<>();
        for (Object rawExcludedPath : rawExcludedPathList) {
            ensureNotInterrupted();
            excludedPaths.add(String.valueOf(rawExcludedPath));
        }
        return excludedPaths;
    }

    private void ensureNotInterrupted() {
        if (Thread.currentThread().isInterrupted()) {
            throw new WorkflowEngineException("Execution interrupted while processing state data");
        }
    }

    private String stringConfig(ExecutionPlanDefinition.ExecutionStepDefinition step, String key) {
        Object value = step.config().get(key);
        if (value == null) {
            throw new WorkflowEngineException("Missing config '" + key + "' for step: " + step.id());
        }
        return String.valueOf(value);
    }
}
