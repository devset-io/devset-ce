/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.connector.api.dto;

import io.devset.ce.be.common.domain.ConnectionType;

/**
 * API DTO describing the health and identity of a registered broker connector.
 *
 * @param type              broker type
 * @param name              connector name
 * @param endpoint          connection endpoint (bootstrap servers or host:port)
 * @param producerConnected {@code true} if the producer side is connected
 * @param consumerConnected {@code true} if the consumer side is connected
 * @param authenticated     {@code true} if credentials were provided
 */
public record ConnectorConnectionStatusDto(
        ConnectionType type,
        String name,
        String endpoint,
        boolean producerConnected,
        boolean consumerConnected,
        boolean authenticated
) {
}
