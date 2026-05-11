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
import io.devset.ce.be.engine.domain.ExecutionPlanEvent;
import io.devset.ce.be.engine.domain.ExecutionPlanState;

import java.util.List;
import java.util.function.BiConsumer;

/**
 * Mutable runtime context threaded through all step handlers during execution.
 * <p>
 * Aggregates the mutable {@link ExecutionPlanState}, the accumulator list of output
 * events, a per-step event listener and the simulation mode flag. Handlers read and
 * write the state, optionally append events, and notify the listener when they emit
 * an event.
 */
public final class ExecutionPlanRuntimeContext {

    private final ExecutionPlanState state;
    private final List<ExecutionPlanEvent> outputEvents;
    private final BiConsumer<ExecutionPlanDefinition.ExecutionStepDefinition, ExecutionPlanEvent> stepEventListener;
    private final boolean simulationMode;

    /**
     * Creates a new runtime context.
     *
     * @param state             mutable state container
     * @param outputEvents      mutable list to which events are appended
     * @param stepEventListener callback invoked when a step emits an event
     * @param simulationMode    {@code true} to disable real sends and waits
     */
    public ExecutionPlanRuntimeContext(
            ExecutionPlanState state,
            List<ExecutionPlanEvent> outputEvents,
            BiConsumer<ExecutionPlanDefinition.ExecutionStepDefinition, ExecutionPlanEvent> stepEventListener,
            boolean simulationMode
    ) {
        this.state = state;
        this.outputEvents = outputEvents;
        this.stepEventListener = stepEventListener;
        this.simulationMode = simulationMode;
    }

    /**
     * Returns the mutable state container for this execution.
     *
     * @return runtime state
     */
    public ExecutionPlanState state() {
        return state;
    }

    /**
     * Returns the mutable output events list for this execution.
     *
     * @return output events list
     */
    public List<ExecutionPlanEvent> outputEvents() {
        return outputEvents;
    }

    /**
     * Notifies the step event listener that the given step produced an event.
     *
     * @param step  step that produced the event
     * @param event event that was produced
     */
    public void publishStepEvent(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanEvent event) {
        stepEventListener.accept(step, event);
    }

    /**
     * Indicates whether the current run is a simulation.
     *
     * @return {@code true} when outbound sends and waits must be skipped
     */
    public boolean simulationMode() {
        return simulationMode;
    }
}
