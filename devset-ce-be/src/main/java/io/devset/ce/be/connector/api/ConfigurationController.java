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

import io.devset.ce.be.connector.api.dto.ConnectorConnectionStatusDto;
import io.devset.ce.be.connector.api.dto.OpenConnectionDto;
import io.devset.ce.be.connector.application.ConnectorFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing broker connector configurations.
 * <p>
 * Provides endpoints to open, delete and list Kafka and RabbitMQ connections.
 * Delegates ALL logic to {@link ConnectorFacade}.
 */
@RestController("connectorConfigurationController")
@RequestMapping("connectors/configurations")
@RequiredArgsConstructor
public class ConfigurationController {

    private final ConnectorFacade connectorFacade;

    /**
     * Opens a new broker connection.
     *
     * @param openConnection connection parameters
     */
    @PostMapping
    void openConnection(@RequestBody OpenConnectionDto openConnection) {
        connectorFacade.openConnection(openConnection);
    }

    /**
     * Removes an existing broker connection.
     *
     * @param type connection type (kafka or rabbit)
     * @param name connection name
     */
    @DeleteMapping("/{type}/{name}")
    void deleteConnection(@PathVariable String type, @PathVariable String name) {
        connectorFacade.deleteConnection(type, name);
    }

    /**
     * Lists all active broker connections sorted by name.
     *
     * @return sorted list of connection statuses
     */
    @GetMapping
    List<ConnectorConnectionStatusDto> listConnections() {
        return connectorFacade.listConnections();
    }
}
