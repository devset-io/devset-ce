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

import org.springframework.lang.Nullable;

/**
 * Request payload for sending a message to a RabbitMQ queue or exchange through a named producer.
 */
public record RabbitSendMessageDto(
        String producerName,
        @Nullable
        String queueName,
        @Nullable
        String exchange,
        @Nullable
        String routingKey,
        String message
) {}
