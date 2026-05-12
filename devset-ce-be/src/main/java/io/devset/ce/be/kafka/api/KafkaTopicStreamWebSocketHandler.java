/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.api;

import io.devset.ce.be.common.util.LogSanitizer;
import io.devset.ce.be.kafka.application.KafkaTopicStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * WebSocket handler that streams records from a Kafka topic to the connected client.
 * <p>
 * Reads {@code connectionName}, {@code topic} and optional {@code offsetMode} from the
 * query string, then delegates to {@link KafkaTopicStreamService}. Closes the session
 * with {@link CloseStatus#BAD_DATA} if required parameters are missing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaTopicStreamWebSocketHandler extends TextWebSocketHandler {

    private static final String CONNECTION_NAME_PARAM = "connectionName";
    private static final String TOPIC_PARAM = "topic";
    private static final String OFFSET_MODE_PARAM = "offsetMode";

    private final KafkaTopicStreamService kafkaTopicStreamService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        if (session.getUri() == null) {
            closeSessionWithBadData(session, "Missing request URI");
            return;
        }

        MultiValueMap<String, String> queryParams = UriComponentsBuilder
                .fromUri(session.getUri())
                .build()
                .getQueryParams();

        String connectionName = queryParams.getFirst(CONNECTION_NAME_PARAM);
        String topic = queryParams.getFirst(TOPIC_PARAM);
        String offsetMode = queryParams.getFirst(OFFSET_MODE_PARAM);

        if (connectionName == null || connectionName.isBlank() || topic == null || topic.isBlank()) {
            closeSessionWithBadData(session, "Missing required query params: connectionName, topic");
            return;
        }

        try {
            kafkaTopicStreamService.startStream(session, connectionName, topic, offsetMode);
        } catch (Exception exception) {
            log.warn(
                    "Cannot start Kafka WS stream. sessionId={}, connectionName={}, topic={}",
                    session.getId(),
                    LogSanitizer.sanitize(connectionName),
                    LogSanitizer.sanitize(topic),
                    exception
            );
            closeSessionWithBadData(session, exception.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        kafkaTopicStreamService.stopStream(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("WS transport error. sessionId={}", session.getId(), exception);
        kafkaTopicStreamService.stopStream(session);
        closeSessionWithBadData(session, "WebSocket transport error");
    }

    private void closeSessionWithBadData(WebSocketSession session, String reason) {
        try {
            if (session.isOpen()) {
                String closeReason = reason == null ? "Bad request" : reason;
                if (closeReason.length() > 120) {
                    closeReason = closeReason.substring(0, 120);
                }
                session.close(CloseStatus.BAD_DATA.withReason(closeReason));
            }
        } catch (Exception ignored) {
            // No-op.
        }
    }
}
