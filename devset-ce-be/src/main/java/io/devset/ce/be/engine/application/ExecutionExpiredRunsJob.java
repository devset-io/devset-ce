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

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that periodically evicts terminal runs whose retention window has expired.
 * <p>
 * Runs every 60 seconds and delegates to {@link ExecutionAsyncService#evictExpiredRuns()}.
 * <p>
 * Retention window: terminal runs ({@code COMPLETED}, {@code FAILED}, {@code STOPPED}) are kept
 * for 1 hour after reaching their terminal state, then removed from both the run repository and
 * the event repository. The TTL is defined in {@code RunLifecycleService} and is
 * not currently configurable via application properties.
 */
@Component
@RequiredArgsConstructor
public final class ExecutionExpiredRunsJob {

    private final ExecutionAsyncService executionAsyncService;

    @Scheduled(fixedDelay = 60_000)
    void evictExpiredRuns() {
        executionAsyncService.evictExpiredRuns();
    }
}
