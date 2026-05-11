/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.application.dto;

/**
 * Reports the connection status of a named Kafka producer and consumer pair.
 */
public record KafkaConnectionStatusDto(
        String name,
        String bootstrapServers,
        boolean producerConnected,
        boolean consumerConnected,
        boolean authenticated
) {}
