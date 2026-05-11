/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline.domain;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.ExecutionPlanInput;

/**
 * Domain service contract for compiling a {@link Workflow} DSL definition into an
 * engine-executable {@link ExecutionPlanInput}.
 * <p>
 * Implementations translate the high-level pipeline stages, assignments and conditions
 * into a flat sequence of typed execution steps that the engine can interpret at runtime.
 */
public interface PipelineCompiler {

    /**
     * Compiles the given workflow into an execution plan.
     *
     * @param request workflow DSL definition; must not be {@code null}
     * @return compiled execution plan input ready for engine execution
     */
    ExecutionPlanInput compile(Workflow request);
}
