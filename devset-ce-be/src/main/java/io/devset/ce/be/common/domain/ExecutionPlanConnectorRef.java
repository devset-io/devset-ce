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

import java.util.Objects;

/**
 * Immutable reference to a broker connector used by an execution plan.
 * <p>
 * Identifies the connection type (Kafka or RabbitMQ) and the named connector instance
 * that the plan requires at runtime. Used to prevent connector removal while active runs
 * depend on it.
 *
 * @param type broker connection type
 * @param name unique connector name
 */
public record ExecutionPlanConnectorRef(
        ConnectionType type,
        String name
) {

    public ExecutionPlanConnectorRef {
        Objects.requireNonNull(type, "type must not be null");
        Objects.requireNonNull(name, "name must not be null");
    }
}
