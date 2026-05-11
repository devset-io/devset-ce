/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.domain;

import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Input bundle for a single execution plan run.
 * <p>
 * Combines the compiled plan definition with a runtime context map and the set of
 * broker connectors the plan will use during execution. Defensive copies are made of
 * mutable collections in the compact constructor.
 *
 * @param definition compiled execution plan definition
 * @param context    runtime key-value context passed into the execution engine
 * @param connectors broker connector references required by this plan
 */
public record ExecutionPlanInput(
        ExecutionPlanDefinition definition,
        Map<String, Object> context,
        Set<ExecutionPlanConnectorRef> connectors
) {

    public ExecutionPlanInput(
            ExecutionPlanDefinition definition,
            Map<String, Object> context
    ) {
        this(definition, context, Set.of());
    }

    public ExecutionPlanInput {
        Objects.requireNonNull(definition, "definition must not be null");
        context = context == null ? Map.of() : Map.copyOf(context);
        connectors = connectors == null ? Set.of() : Set.copyOf(connectors);
    }
}
