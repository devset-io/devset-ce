/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.connector.api;

import io.devset.ce.be.connector.application.ConnectorFacade;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ConfigurationControllerTest {

    private final ConnectorFacade connectorFacade = mock(ConnectorFacade.class);
    private final ConfigurationController controller = new ConfigurationController(connectorFacade);

    @Test
    void shouldDeleteKafkaConnector() {
        controller.deleteConnection("kafka", "orders");

        verify(connectorFacade).deleteConnection("kafka", "orders");
    }

    @Test
    void shouldDeleteRabbitConnector() {
        controller.deleteConnection("rabbit", "events");

        verify(connectorFacade).deleteConnection("rabbit", "events");
    }
}
