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

import java.util.List;

/**
 * API DTO returned by the runs listing endpoint.
 * Groups runs into active (non-terminal) and completed (terminal) buckets.
 *
 * @param active    active run statuses
 * @param completed completed run statuses
 */
public record ExecutionPlanRunsResponseDto(
        List<ExecutionPlanRunStatusResponseDto> active,
        List<ExecutionPlanRunStatusResponseDto> completed
) {}
