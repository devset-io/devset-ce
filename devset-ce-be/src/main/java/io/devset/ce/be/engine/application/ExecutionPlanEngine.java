/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.engine.domain.ExecutionPlanResult;
import io.devset.ce.be.engine.application.steps.StepHandlerRegistry;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StateDataOps;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiConsumer;

/**
 * Core engine that executes compiled {@link ExecutionPlanDefinition} steps sequentially.
 * <p>
 * Builds a mutable runtime state from the input context, walks each step via
 * {@link StepHandlerRegistry}, and collects the produced events. Supports both
 * real execution (with side-effects) and simulation mode (events captured but no
 * outbound sends).
 * <p>
 * The state root contains:
 * <ul>
 *   <li>{@code workflowId} — current workflow definition id</li>
 *   <li>{@code context} — deep-copied external input context</li>
 *   <li>{@code outputEvents} — appended events collected during execution</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public final class ExecutionPlanEngine {

    private final StateDataOps stateDataOps;
    private final StepHandlerRegistry workflowStepHandlers;

    /**
     * Executes the given input against the engine with real side-effects.
     *
     * @param input             compiled execution plan input
     * @param outputEvents      mutable list that collects produced events
     * @param stepEventListener callback invoked per step, receiving the events it produced
     * @return the final result snapshot and events
     */
    public ExecutionPlanResult execute(
            ExecutionPlanInput input,
            List<ExecutionPlanEvent> outputEvents,
            BiConsumer<ExecutionPlanDefinition.ExecutionStepDefinition, List<ExecutionPlanEvent>> stepEventListener
    ) {
        return execute(input, outputEvents, stepEventListener, false);
    }

    /**
     * Simulates execution — all steps run but outbound sends and real waits are skipped.
     *
     * @param input compiled execution plan input
     * @return the simulated result snapshot and events
     */
    public ExecutionPlanResult simulate(ExecutionPlanInput input) {
        return execute(input, new ArrayList<>(), (step, events) -> {}, true);
    }

    private ExecutionPlanResult execute(
            ExecutionPlanInput input,
            List<ExecutionPlanEvent> outputEvents,
            BiConsumer<ExecutionPlanDefinition.ExecutionStepDefinition, List<ExecutionPlanEvent>> stepEventListener,
            boolean simulationMode
    ) {
        Objects.requireNonNull(input, "input must not be null");
        Objects.requireNonNull(outputEvents, "outputEvents must not be null");
        Objects.requireNonNull(stepEventListener, "stepEventListener must not be null");

        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(initialState(input)),
                outputEvents,
                (step, event) -> stepEventListener.accept(step, List.of(event)),
                simulationMode
        );

        // FLOW: sequential step loop — errors bubble up to ExecutionTaskRunner via exception;
        //       simulationMode short-circuits IO (sends, waits) without changing state logic.
        for (ExecutionPlanDefinition.ExecutionStepDefinition step : input.definition().steps()) {
            workflowStepHandlers.handle(step, context);
        }

        return new ExecutionPlanResult(context.state().snapshot(), context.outputEvents());
    }

    private Map<String, Object> initialState(ExecutionPlanInput input) {
        // FLOW: seed root state with WORKFLOW_ID, CONTEXT (input payload),
        // and empty OUTPUT_EVENTS list. All handlers read/write the state
        // via dot-path keys defined in ExecutionStateKeys. Keys NOT listed
        // there are considered ad-hoc and SHOULD be promoted to constants
        // when used by more than one class.
        Map<String, Object> root = new LinkedHashMap<>();
        root.put(ExecutionStateKeys.WORKFLOW_ID, input.definition().workflowId());
        root.put(ExecutionStateKeys.CONTEXT, stateDataOps.deepCopyMap(input.context()));
        root.put(ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>());
        return root;
    }
}
