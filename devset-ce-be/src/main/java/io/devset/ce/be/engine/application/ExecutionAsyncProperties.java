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

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties bound from {@code devset.engine.*} application settings.
 * <p>
 * Enforces runtime safety limits for the engine: the maximum number of concurrently
 * active runs and the maximum number of executions that may be requested in a single
 * run. Both values must be strictly positive; setters reject non-positive updates.
 */
@Component
@ConfigurationProperties(prefix = "devset.engine")
@Getter
public final class ExecutionAsyncProperties {

    private int maxActiveRuns = 10;
    private int maxExecutionsPerRun = 10;

    public void setMaxActiveRuns(int maxActiveRuns) {
        this.maxActiveRuns = requirePositive("devset.engine.max-active-runs", maxActiveRuns);
    }

    public void setMaxExecutionsPerRun(int maxExecutionsPerRun) {
        this.maxExecutionsPerRun = requirePositive("devset.engine.max-executions-per-run", maxExecutionsPerRun);
    }

    private int requirePositive(String propertyName, int value) {
        if (value <= 0) {
            throw new IllegalArgumentException(propertyName + " must be > 0");
        }
        return value;
    }
}
