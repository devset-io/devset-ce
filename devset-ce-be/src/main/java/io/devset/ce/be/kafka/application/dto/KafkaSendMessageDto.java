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

import java.util.Map;

/**
 * Request payload for sending a message to a Kafka topic through a named producer.
 */
public record KafkaSendMessageDto(
        String producerName,
        String topic,
        String key,
        Map<String, Object> headers,
        String message
) {}
