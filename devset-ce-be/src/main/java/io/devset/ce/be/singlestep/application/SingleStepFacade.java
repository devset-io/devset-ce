/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.application;

import io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionRequest;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionResult;

import java.util.List;

/**
 * Facade for ad-hoc single step execution.
 * <p>
 * Executes a single messaging step directly (without running a full workflow) and
 * persists the result as a history entry. This is the only entry point for single
 * step operations from controllers and other modules.
 */
public interface SingleStepFacade {

    /**
     * Executes a single step synchronously and records the outcome in history.
     *
     * @param request the execution request describing target connector, payload and headers
     * @return the execution result including status and any diagnostic information
     */
    SingleStepExecutionResult execute(SingleStepExecutionRequest request);

    /**
     * Returns the history of all past single step executions.
     *
     * @return list of historical executions ordered by recency, possibly empty
     */
    List<SingleStepExecutionHistory> history();
}
