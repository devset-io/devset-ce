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

import io.devset.ce.be.kafka.application.dto.KafkaConnectionStatusDto;
import io.devset.ce.be.kafka.application.dto.KafkaMessageDto;
import io.devset.ce.be.kafka.application.dto.KafkaSendMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Application facade for Kafka operations.
 * <p>
 * Provides a simplified API for connecting, removing, listing and sending messages
 * through named Kafka producer instances. Delegates all operations to the
 * {@link DynamicKafkaProducerManager} port.
 */
@Component
@RequiredArgsConstructor
public class KafkaFacade {
    private final DynamicKafkaProducerManager dynamicKafkaProducerManager;
    private final KafkaTopicFetchService kafkaTopicFetchService;

    /**
     * Registers a named Kafka producer connection.
     *
     * @param name             connection name used to refer to this producer in send operations
     * @param bootstrapServers comma-separated Kafka bootstrap server list
     * @param username         SASL username; may be {@code null} for unauthenticated brokers
     * @param password         SASL password; may be {@code null} for unauthenticated brokers
     */
    public void connect(
            String name,
            String bootstrapServers,
            String username,
            String password
    ) {
        dynamicKafkaProducerManager.connect(
                name,
                bootstrapServers,
                username,
                password
        );
    }

    /**
     * Removes a named Kafka producer connection and releases its resources.
     *
     * @param name connection name to remove
     */
    public void remove(String name) {
        dynamicKafkaProducerManager.remove(name);
    }

    /**
     * Sends a text message using the fields of the provided DTO.
     *
     * @param request send request containing producer name, topic, headers and payload
     */
    public void send(KafkaSendMessageDto request) {
        dynamicKafkaProducerManager.sendMessage(
                request.producerName(),
                request.topic(),
                request.key(),
                request.headers(),
                request.message()
        );
    }

    /**
     * Sends a text message to a Kafka topic.
     *
     * @param producerName named Kafka connection to use
     * @param topic        target Kafka topic
     * @param key          message key for partitioning; {@code null} means round-robin
     * @param headers      optional message headers; {@code null} is treated as empty
     * @param message      text payload
     */
    public void sendMessage(
            String producerName,
            String topic,
            @Nullable String key,
            @Nullable Map<String, Object> headers,
            String message
    ) {
        dynamicKafkaProducerManager.sendMessage(
                producerName,
                topic,
                key,
                headers == null ? Map.of() : headers,
                message
        );
    }

    /**
     * Sends a binary message to a Kafka topic.
     *
     * @param producerName named Kafka connection to use
     * @param topic        target Kafka topic
     * @param key          message key for partitioning; {@code null} means round-robin
     * @param headers      message headers
     * @param message      raw binary payload
     */
    public void sendBinary(
            String producerName,
            String topic,
            @Nullable String key,
            Map<String, Object> headers,
            byte[] message
    ) {
        dynamicKafkaProducerManager.sendBinaryMessage(producerName, topic, key, headers, message);
    }

    /**
     * Lists all registered Kafka producer connections and their status.
     *
     * @return list of connection statuses, possibly empty
     */
    public List<KafkaConnectionStatusDto> listConnections() {
        return dynamicKafkaProducerManager.listConnections();
    }

    /**
     * Fetches the last N messages from a Kafka topic.
     *
     * @param connectionName  registered Kafka connection to use
     * @param topic           topic to read from
     * @param limit           maximum number of messages to return
     * @param beforeTimestamp  if provided, fetches messages older than this timestamp (cursor for paging)
     * @return messages sorted by timestamp descending (newest first)
     */
    public List<KafkaMessageDto> fetchMessages(String connectionName, String topic, Integer limit, Instant beforeTimestamp) {
        return kafkaTopicFetchService.fetchLatest(connectionName, topic, limit, beforeTimestamp);
    }

    /**
     * Lists all available topics on the given Kafka connection.
     *
     * @param connectionName registered Kafka connection to query
     * @return set of topic names available on the broker
     */
    public Set<String> listTopics(String connectionName) {
        return kafkaTopicFetchService.listTopics(connectionName);
    }
}
