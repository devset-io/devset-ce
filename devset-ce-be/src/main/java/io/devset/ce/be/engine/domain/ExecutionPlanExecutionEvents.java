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

/**
 * Events produced by a single execution within a multi-execution run.
 * <p>
 * Groups the output events of the Nth execution under its index, so consumers can
 * correlate events back to a specific execution of the same plan.
 *
 * @param executionIndex zero-based index of the execution within the run
 * @param events         events emitted during this execution
 */
public record ExecutionPlanExecutionEvents(
        int executionIndex,
        List<ExecutionPlanEvent> events
) {}
