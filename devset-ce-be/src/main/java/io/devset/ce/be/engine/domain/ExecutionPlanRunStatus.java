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

/**
 * Lifecycle status of a submitted execution plan run.
 * <p>
 * Transitions: {@code PENDING → RUNNING → (COMPLETED | FAILED | STOPPING → STOPPED)}.
 * {@code STOPPING} is a transient state between a stop request and the run actually
 * halting.
 */
public enum ExecutionPlanRunStatus {
    PENDING,
    RUNNING,
    STOPPING,
    STOPPED,
    COMPLETED,
    FAILED
}
