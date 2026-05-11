/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.application;

import io.devset.ce.be.dbconnector.api.dto.DbConnectionStatusDto;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;

import java.util.List;

/**
 * Facade for database connector operations.
 * <p>
 * This is the single entry point for opening, closing and listing
 * database connections. Controllers call this interface, never
 * internal managers directly.
 */
public interface DbConnectorFacade {

    /**
     * Opens a new database connection based on the provided configuration.
     *
     * @param openConnection connection parameters including type, name and credentials
     */
    void openConnection(OpenDbConnectionDto openConnection);

    /**
     * Removes an existing database connection.
     *
     * @param type connection type as string (e.g. {@code mongodb})
     * @param name connection name
     */
    void deleteConnection(String type, String name);

    /**
     * Lists all active database connections sorted by name.
     *
     * @return sorted list of connection status entries
     */
    List<DbConnectionStatusDto> listConnections();
}
