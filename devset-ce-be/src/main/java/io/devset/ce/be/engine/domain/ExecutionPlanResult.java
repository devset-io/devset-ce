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

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Result of a simulated or completed execution plan run.
 * <p>
 * Captures the final state snapshot together with all output events produced by the
 * plan's stages. Both collections are defensively copied into immutable views.
 *
 * @param state        final state snapshot at the end of the run
 * @param outputEvents events produced by the plan, in emission order
 */
public record ExecutionPlanResult(
        Map<String, Object> state,
        List<ExecutionPlanEvent> outputEvents
) {

    public ExecutionPlanResult {
        Objects.requireNonNull(state, "state must not be null");
        Objects.requireNonNull(outputEvents, "outputEvents must not be null");
        state = Map.copyOf(state);
        outputEvents = List.copyOf(outputEvents);
    }
}
