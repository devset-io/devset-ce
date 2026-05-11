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

import java.time.Instant;
import java.util.Map;

/**
 * Represents a single Kafka message fetched from a topic.
 *
 * @param partition partition the message was read from
 * @param offset    offset within the partition
 * @param timestamp broker or producer timestamp of the record
 * @param key       message key, may be {@code null}
 * @param headers   message headers as string key-value pairs
 * @param value     message payload
 */
public record KafkaMessageDto(
        int partition,
        long offset,
        Instant timestamp,
        String key,
        Map<String, String> headers,
        String value
) {}
