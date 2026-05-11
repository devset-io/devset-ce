/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.testutil;

import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.domain.ExecutionPlanState;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Test builder for {@link ExecutionPlanRuntimeContext}.
 * <p>
 * Provides a standard initial state ({@code currentEvent}, {@code currentEventHeaders},
 * {@code outputEvents}, {@code meta}) matching what the engine injects before any step runs.
 * Use {@link #with(String, Object)} to pre-populate specific state paths.
 *
 * <pre>{@code
 * // minimal default context
 * ExecutionPlanRuntimeContext ctx = RuntimeContextBuilder.context().build();
 *
 * // with pre-populated state
 * ExecutionPlanRuntimeContext ctx = RuntimeContextBuilder.context()
 *         .with("currentEvent.flag", true)
 *         .with("meta.loop.currentIteration", 0)
 *         .build();
 * }</pre>
 */
public final class RuntimeContextBuilder {

    private final LinkedHashMap<String, Object> root = new LinkedHashMap<>();
    private boolean simulationMode = false;

    private RuntimeContextBuilder() {
        root.put(ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>());
        root.put(ExecutionStateKeys.CURRENT_EVENT_HEADERS, new LinkedHashMap<>());
        root.put(ExecutionStateKeys.CURRENT_EVENT_KEY, "");
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        root.put("meta", new LinkedHashMap<>());
    }

    /** Creates a builder pre-populated with the standard engine state structure. */
    public static RuntimeContextBuilder context() {
        return new RuntimeContextBuilder();
    }

    /**
     * Sets a dot-path value in the runtime state before the context is built.
     * Intermediate maps are created automatically (same semantics as {@link ExecutionPlanState#put}).
     */
    public RuntimeContextBuilder with(String path, Object value) {
        ExecutionPlanState state = new ExecutionPlanState(root);
        state.put(path, value);
        return this;
    }

    /**
     * Sets a top-level state key to the given map value.
     * Useful for replacing the entire {@code currentEvent} or {@code meta} subtree.
     */
    public RuntimeContextBuilder withMap(String key, Map<String, Object> value) {
        root.put(key, new LinkedHashMap<>(value));
        return this;
    }

    /** Enables simulation mode — step handlers skip IO side-effects when {@code true}. */
    public RuntimeContextBuilder simulationMode(boolean enabled) {
        this.simulationMode = enabled;
        return this;
    }

    /** Builds the {@link ExecutionPlanRuntimeContext} from the current builder state. */
    public ExecutionPlanRuntimeContext build() {
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(root),
                new ArrayList<>(),
                (step, event) -> {},
                simulationMode
        );
    }
}
