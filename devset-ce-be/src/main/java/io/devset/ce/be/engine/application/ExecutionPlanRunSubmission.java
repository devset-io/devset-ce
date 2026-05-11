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

/**
 * Result of submitting an execution plan for asynchronous processing.
 *
 * @param runId      unique identifier assigned to the run
 * @param status     initial run status (e.g. "PENDING")
 * @param executions number of executions requested
 */
public record ExecutionPlanRunSubmission(
        String runId,
        String status,
        int executions
) {}
