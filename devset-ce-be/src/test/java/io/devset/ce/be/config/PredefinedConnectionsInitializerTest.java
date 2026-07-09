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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.connector.api.dto.OpenConnectionDto;
import io.devset.ce.be.connector.application.ConnectorFacade;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;
import io.devset.ce.be.dbconnector.application.DbConnectorFacade;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class PredefinedConnectionsInitializerTest {

    private final ConnectorFacade connectorFacade = mock(ConnectorFacade.class);
    private final DbConnectorFacade dbConnectorFacade = mock(DbConnectorFacade.class);
    private final PredefinedConnectionsProperties properties = new PredefinedConnectionsProperties();

    private final PredefinedConnectionsInitializer initializer =
            new PredefinedConnectionsInitializer(properties, connectorFacade, dbConnectorFacade);

    @Test
    void shouldOpenPredefinedKafkaConnection() {
        properties.setKafka(List.of(new PredefinedConnectionsProperties.KafkaConnection(
                "local-kafka", "localhost:29092", "user", "pass")));

        initializer.createPredefinedConnections();

        verify(connectorFacade).openConnection(new OpenConnectionDto(
                ConnectionType.KAFKA, "local-kafka", "localhost:29092",
                null, null, null, "user", "pass"));
    }

    @Test
    void shouldOpenPredefinedRabbitConnection() {
        properties.setRabbit(List.of(new PredefinedConnectionsProperties.RabbitConnection(
                "local-rabbit", "localhost", 5672, "/", null, null)));

        initializer.createPredefinedConnections();

        verify(connectorFacade).openConnection(new OpenConnectionDto(
                ConnectionType.RABBIT, "local-rabbit", null,
                "localhost", 5672, "/", null, null));
    }

    @Test
    void shouldOpenPredefinedDatabaseConnection() {
        properties.setDatabases(List.of(new PredefinedConnectionsProperties.DatabaseConnection(
                "mongodb", "local-mongo", "mongodb://localhost:27017", "devset", null, null)));

        initializer.createPredefinedConnections();

        verify(dbConnectorFacade).openConnection(new OpenDbConnectionDto(
                DbConnectionType.MONGODB, "local-mongo",
                "mongodb://localhost:27017", "devset", null, null));
    }

    @Test
    void shouldContinueWhenOneConnectionFails() {
        properties.setKafka(List.of(new PredefinedConnectionsProperties.KafkaConnection(
                "broken-kafka", "localhost:29092", null, null)));
        properties.setDatabases(List.of(new PredefinedConnectionsProperties.DatabaseConnection(
                "mongodb", "local-mongo", "mongodb://localhost:27017", "devset", null, null)));
        doThrow(new WorkflowEngineException("broker down"))
                .when(connectorFacade).openConnection(any());

        assertThatCode(initializer::createPredefinedConnections).doesNotThrowAnyException();

        verify(dbConnectorFacade).openConnection(any(OpenDbConnectionDto.class));
    }

    @Test
    void shouldDoNothingWhenNoConnectionsConfigured() {
        initializer.createPredefinedConnections();

        verifyNoInteractions(connectorFacade, dbConnectorFacade);
    }
}
