/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.connector.application;

import io.devset.ce.be.connector.api.dto.ConnectorConnectionStatusDto;
import io.devset.ce.be.connector.api.dto.OpenConnectionDto;

import java.util.List;

/**
 * Facade for broker connector operations.
 * <p>
 * This is the single entry point for opening, closing and listing
 * Kafka and RabbitMQ connections. Controllers and other modules call
 * this interface, never internal broker managers directly.
 */
public interface ConnectorFacade {

    /**
     * Opens a new broker connection based on the provided configuration.
     *
     * @param openConnection connection parameters including type, name and credentials
     */
    void openConnection(OpenConnectionDto openConnection);

    /**
     * Removes an existing broker connection.
     *
     * @param type connection type as string (kafka or rabbit)
     * @param name connection name
     */
    void deleteConnection(String type, String name);

    /**
     * Lists all active broker connections sorted by name.
     *
     * @return sorted list of connection status entries
     */
    List<ConnectorConnectionStatusDto> listConnections();
}
