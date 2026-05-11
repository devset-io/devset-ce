/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.api.dto;

/**
 * API DTO returned when a workflow is submitted for asynchronous execution.
 *
 * @param runId      unique run identifier
 * @param status     initial run status (e.g. {@code PENDING})
 * @param executions number of executions requested
 */
public record ExecutionPlanSubmitResponseDto(
        String runId,
        String status,
        int executions
) {}
