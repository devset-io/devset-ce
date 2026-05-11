/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.domain;

import io.devset.ce.be.common.domain.WorkflowEngineException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Mutable, dot-path addressable state container used during execution plan runs.
 * <p>
 * Values are stored in a nested {@link LinkedHashMap} structure. Path segments are
 * separated by dots (e.g. {@code user.address.city}). Missing intermediate maps are
 * created automatically by {@link #put(String, Object)}.
 * <p>
 * <b>WHY mutable, not a record:</b> steps mutate state in-place as they execute. The
 * accumulated state (currentEvent, outputEvents, meta, etc.) is the primary output
 * of a run. A record would require rebuilding the full tree on every step — impractical.
 * This is an intentional, documented exception to the {@code domain = records} rule.
 * <p>
 * <b>Thread safety:</b> not thread-safe by design. One instance is created per
 * execution and used only within that execution's single-threaded step loop.
 * Never share an instance between concurrent executions.
 */
public class ExecutionPlanState {

    private final Map<String, Object> values;

    /**
     * Creates a new state seeded with a defensive copy of the given values.
     *
     * @param initialValues initial state values; must not be {@code null}
     */
    public ExecutionPlanState(Map<String, Object> initialValues) {
        this.values = new LinkedHashMap<>(initialValues);
    }

    /**
     * Retrieves the value at the given dot-separated path.
     *
     * @param path dot-separated path (e.g. {@code a.b.c})
     * @return the value at the path
     * @throws WorkflowEngineException if any segment of the path does not resolve
     */
    public Object get(String path) {
        String[] segments = path.split("\\.");
        Object current = values;
        for (String segment : segments) {
            if (!(current instanceof Map<?, ?> currentMap) || !currentMap.containsKey(segment)) {
                throw new WorkflowEngineException("State path not found: " + path);
            }
            current = currentMap.get(segment);
        }
        return current;
    }

    /**
     * Retrieves the value at the given path, returning a fallback when missing.
     *
     * @param path         dot-separated path
     * @param defaultValue value returned when the path cannot be resolved
     * @return the resolved value, or {@code defaultValue}
     */
    public Object getOrDefault(String path, Object defaultValue) {
        String[] segments = path.split("\\.");
        Object current = values;
        for (String segment : segments) {
            if (!(current instanceof Map<?, ?> currentMap) || !currentMap.containsKey(segment)) {
                return defaultValue;
            }
            current = currentMap.get(segment);
        }
        return current;
    }

    /**
     * Stores a value at the given path, creating intermediate maps as needed.
     * <p>
     * NOTE: intermediate maps are auto-created. {@code put("a.b.c", v)} will create the
     * {@code a} and {@code a.b} maps if they do not already exist.
     *
     * @param path  dot-separated path; the last segment becomes the key
     * @param value value to store
     * @throws WorkflowEngineException if an intermediate segment resolves to a non-map value
     */
    @SuppressWarnings("unchecked")
    public void put(String path, Object value) {
        String[] segments = path.split("\\.");
        Map<String, Object> current = values;
        for (int i = 0; i < segments.length - 1; i++) {
            String segment = segments[i];
            Object next = current.get(segment);
            if (next == null) {
                LinkedHashMap<String, Object> nested = new LinkedHashMap<>();
                current.put(segment, nested);
                current = nested;
                continue;
            }
            if (!(next instanceof Map<?, ?>)) {
                throw new WorkflowEngineException("State path is not an object: " + path);
            }
            current = (Map<String, Object>) next;
        }
        current.put(segments[segments.length - 1], value);
    }

    /**
     * Removes the value at the given path. No-op if the path does not resolve.
     *
     * @param path dot-separated path
     */
    @SuppressWarnings("unchecked")
    public void remove(String path) {
        String[] segments = path.split("\\.");
        Map<String, Object> current = values;
        for (int i = 0; i < segments.length - 1; i++) {
            String segment = segments[i];
            Object next = current.get(segment);
            if (!(next instanceof Map<?, ?> nextMap)) {
                return;
            }
            current = (Map<String, Object>) nextMap;
        }
        current.remove(segments[segments.length - 1]);
    }

    /**
     * Returns an immutable deep copy of the current state tree.
     *
     * @return deep copy of all state values
     */
    public Map<String, Object> snapshot() {
        return deepCopyMap(values);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deepCopyMap(Map<String, Object> source) {
        LinkedHashMap<String, Object> copy = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof Map<?, ?> nestedMap) {
                copy.put(entry.getKey(), deepCopyMap((Map<String, Object>) nestedMap));
                continue;
            }
            copy.put(entry.getKey(), value);
        }
        return copy;
    }
}
