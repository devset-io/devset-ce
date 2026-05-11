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
import io.devset.ce.be.rabbit.application.dto.RabbitSendMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.lang.Nullable;

import java.util.List;

/**
 * Application facade for RabbitMQ operations.
 * <p>
 * Provides a simplified API for connecting, removing, listing and sending messages
 * through named RabbitMQ producer instances. Delegates all operations to the
 * {@link DynamicRabbitProducerManager} port.
 */
@Component
@RequiredArgsConstructor
public class RabbitFacade {

    private final DynamicRabbitProducerManager dynamicRabbitProducerManager;

    /**
     * Registers a named RabbitMQ producer connection.
     *
     * @param name        connection name used to refer to this producer in send operations
     * @param host        RabbitMQ broker host
     * @param port        RabbitMQ broker port
     * @param virtualHost virtual host to connect to
     * @param username    authentication user
     * @param password    authentication password
     */
    public void connect(
            String name,
            String host,
            Integer port,
            String virtualHost,
            String username,
            String password
    ) {
        dynamicRabbitProducerManager.connect(
                name,
                host,
                port,
                virtualHost,
                username,
                password
        );
    }

    /**
     * Removes a named RabbitMQ producer connection and releases its resources.
     *
     * @param name connection name to remove
     */
    public void remove(String name) {
        dynamicRabbitProducerManager.remove(name);
    }

    /**
     * Sends a text message using the fields of the provided DTO.
     *
     * @param request send request containing producer name, routing details and payload
     */
    public void send(RabbitSendMessageDto request) {
        dynamicRabbitProducerManager.sendMessage(
                request.producerName(),
                request.queueName(),
                request.exchange(),
                request.routingKey(),
                request.message()
        );
    }

    /**
     * Sends a text message through RabbitMQ.
     * Either {@code queueName} (direct-to-queue) or {@code exchange}+{@code routingKey} must
     * identify the destination.
     *
     * @param producerName named RabbitMQ connection to use
     * @param queueName    target queue for direct-to-queue publishing; may be {@code null}
     * @param exchange     target exchange; may be {@code null}
     * @param routingKey   routing key used with the exchange; may be {@code null}
     * @param message      text payload
     */
    public void sendMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            String message
    ) {
        dynamicRabbitProducerManager.sendMessage(
                producerName,
                queueName,
                exchange,
                routingKey,
                message
        );
    }

    /**
     * Sends a binary message through RabbitMQ.
     *
     * @param producerName named RabbitMQ connection to use
     * @param queueName    target queue for direct-to-queue publishing; may be {@code null}
     * @param exchange     target exchange; may be {@code null}
     * @param routingKey   routing key used with the exchange; may be {@code null}
     * @param message      raw binary payload
     * @param contentType  content type to annotate the outgoing message with; may be {@code null}
     */
    public void sendBinary(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            byte[] message,
            @Nullable String contentType
    ) {
        dynamicRabbitProducerManager.sendBinaryMessage(
                producerName,
                queueName,
                exchange,
                routingKey,
                message,
                contentType
        );
    }

    /**
     * Lists all registered RabbitMQ producer connections and their status.
     *
     * @return list of connection statuses, possibly empty
     */
    public List<RabbitConnectionStatusDto> listConnections() {
        return dynamicRabbitProducerManager.listConnections();
    }

    /**
     * Discovers queues and exchanges from the RabbitMQ Management API for a given connection.
     * Returns an unavailable result when the Management Plugin is absent or unreachable.
     *
     * @param connectionName registered connection to query
     * @return broker resources with availability flag
     */
    public RabbitBrokerResourcesDto listBrokerResources(String connectionName) {
        return dynamicRabbitProducerManager.listBrokerResources(connectionName);
    }
}
