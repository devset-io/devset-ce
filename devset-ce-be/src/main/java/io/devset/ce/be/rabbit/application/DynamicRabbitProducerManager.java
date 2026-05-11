/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.application;

import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import io.devset.ce.be.rabbit.application.dto.RabbitConnectionStatusDto;
import org.springframework.lang.Nullable;

import java.util.List;

/**
 * Application-layer port for managing dynamic RabbitMQ producer connections.
 * <p>
 * Provides lifecycle operations (connect, remove) and message sending capabilities
 * for named RabbitMQ producer instances. Supports sending to queues directly,
 * or via exchange/routing-key combinations, for both text and binary payloads.
 */
public interface DynamicRabbitProducerManager {

    /**
     * Registers a named RabbitMQ producer connection.
     *
     * @param name        connection name used to look up the producer in subsequent operations
     * @param host        RabbitMQ broker host
     * @param port        RabbitMQ broker port
     * @param virtualHost virtual host to connect to
     * @param username    authentication user
     * @param password    authentication password
     */
    void connect(
            String name,
            String host,
            Integer port,
            String virtualHost,
            String username,
            String password
    );

    /**
     * Removes a named RabbitMQ producer connection and releases its resources.
     *
     * @param name connection name to remove
     */
    void remove(String name);

    /**
     * Lists all registered RabbitMQ producer connections and their status.
     *
     * @return list of connection statuses, possibly empty
     */
    List<RabbitConnectionStatusDto> listConnections();

    /**
     * Discovers queues and exchanges from the RabbitMQ Management API.
     * Returns {@link RabbitBrokerResourcesDto#unavailable()} when the plugin is absent or unreachable.
     *
     * @param connectionName named connection whose credentials and host are used for the query
     * @return broker resources with availability flag
     */
    RabbitBrokerResourcesDto listBrokerResources(String connectionName);

    /**
     * Sends a text message through RabbitMQ.
     * Either {@code queueName} (direct-to-queue) or {@code exchange}+{@code routingKey}
     * must identify the destination.
     *
     * @param producerName named connection to use
     * @param queueName    target queue for direct-to-queue publishing; may be {@code null}
     * @param exchange     target exchange; may be {@code null}
     * @param routingKey   routing key used with the exchange; may be {@code null}
     * @param message      text payload
     */
    void sendMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            String message
    );

    /**
     * Sends a binary message through RabbitMQ.
     *
     * @param producerName named connection to use
     * @param queueName    target queue for direct-to-queue publishing; may be {@code null}
     * @param exchange     target exchange; may be {@code null}
     * @param routingKey   routing key used with the exchange; may be {@code null}
     * @param message      raw binary payload
     * @param contentType  content type to annotate the outgoing message with; may be {@code null}
     */
    void sendBinaryMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            byte[] message,
            @Nullable String contentType
    );
}
