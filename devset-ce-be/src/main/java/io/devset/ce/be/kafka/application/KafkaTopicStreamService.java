/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.header.Header;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Streams Kafka topic records to a WebSocket client as JSON events.
 * <p>
 * Each active stream runs on its own executor thread, polling messages from Kafka and
 * forwarding them to the WebSocket session. Supports connection status, per-message and
 * error events. Streams are automatically cancelled when the WebSocket is closed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaTopicStreamService {

    private static final Duration POLL_TIMEOUT = Duration.ofMillis(500);

    private final DynamicKafkaProducerManager dynamicKafkaProducerManager;
    private final ObjectMapper objectMapper;

    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();
    private final ConcurrentMap<String, StreamSession> streamSessions = new ConcurrentHashMap<>();

    /**
     * Starts a Kafka streaming session that forwards records to the given WebSocket.
     * <p>
     * Sends a {@code connected} event immediately, then a {@code message} event per
     * record, or an {@code error} event and closes the session on failure.
     *
     * @param webSocketSession target WebSocket session receiving the events
     * @param connectionName   name of the registered Kafka connection
     * @param topic            topic to subscribe to
     * @param offsetMode       initial offset reset strategy (e.g. {@code earliest}, {@code latest})
     */
    public void startStream(
            WebSocketSession webSocketSession,
            String connectionName,
            String topic,
            String offsetMode
    ) {
        KafkaConsumer<String, String> consumer = dynamicKafkaProducerManager.createStreamingConsumer(connectionName, offsetMode);
        consumer.subscribe(List.of(topic));

        sendEvent(webSocketSession, KafkaTopicStreamEvent.connected(connectionName, topic));

        Future<?> consumerTask = streamExecutor.submit(() -> {
            try {
                while (webSocketSession.isOpen() && !Thread.currentThread().isInterrupted()) {
                    var records = consumer.poll(POLL_TIMEOUT);
                    for (ConsumerRecord<String, String> record : records) {
                        sendEvent(webSocketSession, KafkaTopicStreamEvent.message(
                                connectionName,
                                topic,
                                record.partition(),
                                record.offset(),
                                Instant.ofEpochMilli(record.timestamp()),
                                record.key(),
                                headers(record),
                                record.value()
                        ));
                    }
                }
            } catch (Exception exception) {
                log.warn(
                        "Kafka WS stream error. sessionId={}, connectionName={}, topic={}",
                        webSocketSession.getId(),
                        connectionName,
                        topic,
                        exception
                );
                sendEvent(webSocketSession, KafkaTopicStreamEvent.error(connectionName, topic, exception.getMessage()));
                closeSessionSilently(webSocketSession, CloseStatus.SERVER_ERROR);
            } finally {
                consumer.close();
                streamSessions.remove(webSocketSession.getId());
            }
        });

        streamSessions.put(webSocketSession.getId(), new StreamSession(consumerTask));
    }

    /**
     * Cancels the active streaming task for the given WebSocket, if any.
     *
     * @param webSocketSession WebSocket session whose stream should be stopped
     */
    public void stopStream(WebSocketSession webSocketSession) {
        StreamSession streamSession = streamSessions.remove(webSocketSession.getId());
        if (streamSession != null) {
            streamSession.consumerTask().cancel(true);
        }
    }

    @PreDestroy
    void shutdownExecutor() {
        streamExecutor.shutdownNow();
    }

    private void sendEvent(WebSocketSession webSocketSession, KafkaTopicStreamEvent event) {
        if (!webSocketSession.isOpen()) {
            return;
        }

        try {
            synchronized (webSocketSession) {
                webSocketSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(event)));
            }
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize Kafka WS event", exception);
        } catch (Exception exception) {
            log.debug("Cannot send Kafka WS message. sessionId={}", webSocketSession.getId(), exception);
        }
    }

    private Map<String, String> headers(ConsumerRecord<String, String> record) {
        Map<String, String> result = new HashMap<>();
        for (Header header : record.headers()) {
            result.put(
                    header.key(),
                    header.value() == null ? null : new String(header.value(), StandardCharsets.UTF_8)
            );
        }
        return result;
    }

    private void closeSessionSilently(WebSocketSession webSocketSession, CloseStatus closeStatus) {
        try {
            if (webSocketSession.isOpen()) {
                webSocketSession.close(closeStatus);
            }
        } catch (Exception ignored) {
            // No-op: session may already be closed by the client.
        }
    }

    private record StreamSession(Future<?> consumerTask) {
    }

    private record KafkaTopicStreamEvent(
            String type,
            String connectionName,
            String topic,
            Integer partition,
            Long offset,
            Instant timestamp,
            String key,
            Map<String, String> headers,
            String value,
            String error
    ) {
        private static KafkaTopicStreamEvent connected(String connectionName, String topic) {
            return new KafkaTopicStreamEvent(
                    "connected",
                    connectionName,
                    topic,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }

        private static KafkaTopicStreamEvent message(
                String connectionName,
                String topic,
                Integer partition,
                Long offset,
                Instant timestamp,
                String key,
                Map<String, String> headers,
                String value
        ) {
            return new KafkaTopicStreamEvent(
                    "message",
                    connectionName,
                    topic,
                    partition,
                    offset,
                    timestamp,
                    key,
                    headers,
                    value,
                    null
            );
        }

        private static KafkaTopicStreamEvent error(String connectionName, String topic, String errorMessage) {
            return new KafkaTopicStreamEvent(
                    "error",
                    connectionName,
                    topic,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    Objects.requireNonNullElse(errorMessage, "Unknown error")
            );
        }
    }
}
