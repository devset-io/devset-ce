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
import org.apache.kafka.clients.consumer.KafkaConsumer;

import java.util.Map;
import java.util.List;

/**
 * Application-layer port for managing dynamic Kafka producer connections.
 * <p>
 * Provides lifecycle operations (connect, remove) and message sending capabilities
 * for named Kafka producer instances. Implementations are responsible for connection
 * pooling, producer factory management, and active-run protection.
 */
public interface DynamicKafkaProducerManager {

    /**
     * Registers a named Kafka producer connection.
     *
     * @param name             connection name used to look up the producer in subsequent operations
     * @param bootstrapServers comma-separated Kafka bootstrap server list
     * @param username         SASL username; may be {@code null} for unauthenticated brokers
     * @param password         SASL password; may be {@code null} for unauthenticated brokers
     */
    void connect(
            String name,
            String bootstrapServers,
            String username,
            String password
    );

    /**
     * Removes a named Kafka producer connection and releases its resources.
     *
     * @param name connection name to remove
     */
    void remove(String name);

    /**
     * Lists all registered Kafka producer connections and their status.
     *
     * @return list of connection statuses, possibly empty
     */
    List<KafkaConnectionStatusDto> listConnections();

    /**
     * Sends a text message to a Kafka topic.
     *
     * @param producerName named connection to use
     * @param topic        target Kafka topic
     * @param key          message key for partitioning; {@code null} means round-robin
     * @param headers      message headers
     * @param message      text payload
     */
    void sendMessage(String producerName, String topic, String key, Map<String, Object> headers, String message);

    /**
     * Sends a binary message to a Kafka topic.
     *
     * @param producerName named connection to use
     * @param topic        target Kafka topic
     * @param key          message key for partitioning; {@code null} means round-robin
     * @param headers      message headers
     * @param message      raw binary payload
     */
    void sendBinaryMessage(String producerName, String topic, String key, Map<String, Object> headers, byte[] message);

    /**
     * Creates a streaming consumer bound to a registered connection.
     * <p>
     * The caller is responsible for closing the returned {@link KafkaConsumer}.
     *
     * @param connectionName name of the registered connection whose bootstrap config is reused
     * @param offsetMode     initial offset reset strategy (e.g. {@code earliest}, {@code latest})
     * @return a configured Kafka consumer ready to subscribe
     */
    KafkaConsumer<String, String> createStreamingConsumer(String connectionName, String offsetMode);

}
