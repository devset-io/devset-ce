/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config.web;

import io.devset.ce.be.kafka.api.KafkaTopicStreamWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket endpoint configuration for Kafka topic streaming.
 * <p>
 * Allowed origins are read from the {@code devset.cors.allowed-origins} property
 * to stay consistent with {@link CorsConfig}.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final KafkaTopicStreamWebSocketHandler kafkaTopicStreamWebSocketHandler;
    private final String[] allowedOrigins;

    public WebSocketConfig(
            KafkaTopicStreamWebSocketHandler kafkaTopicStreamWebSocketHandler,
            @Value("${devset.cors.allowed-origins:http://localhost:5173}") String[] allowedOrigins) {
        this.kafkaTopicStreamWebSocketHandler = kafkaTopicStreamWebSocketHandler;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(kafkaTopicStreamWebSocketHandler, "/ws/kafka/topic-stream")
                .setAllowedOrigins(allowedOrigins);
    }
}
