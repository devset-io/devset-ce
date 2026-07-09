/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config;

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Configuration properties bound from {@code devset.predefined-connections.*}.
 * <p>
 * Declares broker and database connections that are created automatically at
 * startup, so a fresh or restarted instance comes up with its default
 * connections in place. Typically supplied via an external {@code application.yml}
 * mounted next to the container image (e.g. {@code /app/config/application.yml}).
 * Credentials are optional and may reference environment variables via
 * {@code ${VAR}} placeholders.
 */
@Component
@ConfigurationProperties(prefix = "devset.predefined-connections")
@Getter
public final class PredefinedConnectionsProperties {

    private List<KafkaConnection> kafka = List.of();
    private List<RabbitConnection> rabbit = List.of();
    private List<DatabaseConnection> databases = List.of();

    public void setKafka(List<KafkaConnection> kafka) {
        this.kafka = kafka == null ? List.of() : List.copyOf(kafka);
    }

    public void setRabbit(List<RabbitConnection> rabbit) {
        this.rabbit = rabbit == null ? List.of() : List.copyOf(rabbit);
    }

    public void setDatabases(List<DatabaseConnection> databases) {
        this.databases = databases == null ? List.of() : List.copyOf(databases);
    }

    /**
     * Predefined Kafka connection entry.
     *
     * @param name             connection name used by producers and facades
     * @param bootstrapServers Kafka bootstrap servers list (comma-separated)
     * @param username         optional authentication username
     * @param password         optional authentication password
     */
    public record KafkaConnection(
            String name,
            String bootstrapServers,
            String username,
            String password
    ) {
    }

    /**
     * Predefined RabbitMQ connection entry.
     *
     * @param name        connection name used by producers and facades
     * @param host        RabbitMQ host
     * @param port        RabbitMQ port (defaults to 5672 when omitted)
     * @param virtualHost RabbitMQ virtual host (defaults to {@code /} when omitted)
     * @param username    optional authentication username
     * @param password    optional authentication password
     */
    public record RabbitConnection(
            String name,
            String host,
            Integer port,
            String virtualHost,
            String username,
            String password
    ) {
    }

    /**
     * Predefined database connection entry.
     *
     * @param type             database type external name (e.g. {@code mongodb})
     * @param name             connection name used to reference this client
     * @param connectionString database connection URI (e.g. {@code mongodb://host:27017})
     * @param database         database name to use for this connection
     * @param username         optional authentication username
     * @param password         optional authentication password
     */
    public record DatabaseConnection(
            String type,
            String name,
            String connectionString,
            String database,
            String username,
            String password
    ) {
    }
}
