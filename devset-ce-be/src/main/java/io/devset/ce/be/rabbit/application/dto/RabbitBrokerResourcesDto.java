/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.application.dto;

import java.util.List;

/**
 * Broker resource discovery result for a RabbitMQ connection.
 * <p>
 * When the Management Plugin is available, {@code available} is {@code true} and
 * {@code queues}/{@code exchanges} contain the broker-reported names.
 * When the plugin is absent or unreachable, {@code available} is {@code false}
 * and the lists are empty — the frontend should render a fallback message.
 *
 * @param available whether the Management API responded successfully
 * @param queues    queue names visible to the authenticated user (empty when unavailable)
 * @param exchanges exchange names visible to the authenticated user (empty when unavailable)
 */
public record RabbitBrokerResourcesDto(
        boolean available,
        List<String> queues,
        List<String> exchanges
) {

    /** Returns an unavailable result with empty lists. */
    public static RabbitBrokerResourcesDto unavailable() {
        return new RabbitBrokerResourcesDto(false, List.of(), List.of());
    }
}
