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

import java.util.List;
import java.util.Map;

/**
 * Compiled execution plan ready for engine execution.
 * <p>
 * Produced by the pipeline compiler from a {@link Workflow} DSL definition. Consists
 * of a flat ordered list of typed steps that the engine walks sequentially at runtime.
 *
 * @param workflowId source workflow identifier
 * @param steps      ordered list of compiled execution steps
 */
public record ExecutionPlanDefinition(
        String workflowId,
        List<ExecutionStepDefinition> steps
) {

    /**
     * Single compiled step within an execution plan.
     *
     * @param id        unique step identifier within the plan
     * @param type      step type driving handler selection
     * @param config    handler-specific configuration map
     * @param stageName originating pipeline stage name; may be {@code null} for synthetic steps
     */
    public record ExecutionStepDefinition(
            String id,
            StepType type,
            Map<String, Object> config,
            String stageName
    ) {
        /**
         * Convenience constructor for steps without a stage attribution.
         *
         * @param id     step identifier
         * @param type   step type
         * @param config handler configuration
         */
        public ExecutionStepDefinition(String id, StepType type, Map<String, Object> config) {
            this(id, type, config, null);
        }
    }
}
