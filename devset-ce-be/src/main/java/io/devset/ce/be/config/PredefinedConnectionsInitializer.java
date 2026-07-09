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

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.DbConnectionType;
import io.devset.ce.be.connector.api.dto.OpenConnectionDto;
import io.devset.ce.be.connector.application.ConnectorFacade;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;
import io.devset.ce.be.dbconnector.application.DbConnectorFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Creates predefined broker and database connections at startup.
 * <p>
 * Reads {@link PredefinedConnectionsProperties} and opens each declared
 * connection through the public facades. A failing entry is logged and
 * skipped so that an unreachable broker never prevents the application
 * from starting.
 */
@Component
@RequiredArgsConstructor
@Slf4j
class PredefinedConnectionsInitializer {

    private final PredefinedConnectionsProperties properties;
    private final ConnectorFacade connectorFacade;
    private final DbConnectorFacade dbConnectorFacade;

    @EventListener(ApplicationReadyEvent.class)
    void createPredefinedConnections() {
        properties.getKafka().forEach(entry -> open("Kafka", entry.name(), () ->
                connectorFacade.openConnection(new OpenConnectionDto(
                        ConnectionType.KAFKA,
                        entry.name(),
                        entry.bootstrapServers(),
                        null,
                        null,
                        null,
                        entry.username(),
                        entry.password()
                ))));
        properties.getRabbit().forEach(entry -> open("RabbitMQ", entry.name(), () ->
                connectorFacade.openConnection(new OpenConnectionDto(
                        ConnectionType.RABBIT,
                        entry.name(),
                        null,
                        entry.host(),
                        entry.port(),
                        entry.virtualHost(),
                        entry.username(),
                        entry.password()
                ))));
        properties.getDatabases().forEach(entry -> open("database", entry.name(), () ->
                dbConnectorFacade.openConnection(new OpenDbConnectionDto(
                        DbConnectionType.from(entry.type()),
                        entry.name(),
                        entry.connectionString(),
                        entry.database(),
                        entry.username(),
                        entry.password()
                ))));
    }

    private void open(String kind, String name, Runnable action) {
        try {
            action.run();
            log.info("Created predefined {} connection: {}", kind, name);
        } catch (RuntimeException e) {
            log.warn("Failed to create predefined {} connection '{}': {}", kind, name, e.getMessage());
        }
    }
}
