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
 * API DTO for opening a new broker connection.
 * Kafka connections use {@code bootstrapServers}; RabbitMQ connections use
 * {@code host}, {@code port} and {@code virtualHost}. Credentials are optional.
 *
 * @param type             broker type
 * @param name             connection name used by producers and facades
 * @param bootstrapServers Kafka bootstrap servers list (comma-separated)
 * @param host             RabbitMQ host
 * @param port             RabbitMQ port
 * @param virtualHost      RabbitMQ virtual host
 * @param username         optional authentication username
 * @param password         optional authentication password
 */
public record OpenConnectionDto(
        ConnectionType type,
        String name,
        String bootstrapServers,
        String host,
        Integer port,
        String virtualHost,
        String username,
        String password
) {
}
