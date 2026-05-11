/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.api;

import io.devset.ce.be.dbconnector.api.dto.DbConnectionStatusDto;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;
import io.devset.ce.be.dbconnector.application.DbConnectorFacade;
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
 * REST controller for managing database connector configurations.
 * <p>
 * Provides endpoints to open, delete and list database connections.
 * Delegates ALL logic to {@link DbConnectorFacade}.
 */
@RestController
@RequestMapping("db/connectors/configurations")
@RequiredArgsConstructor
public class DbConfigurationController {

    private final DbConnectorFacade dbConnectorFacade;

    /**
     * Opens a new database connection.
     *
     * @param openConnection connection parameters
     */
    @PostMapping
    void openConnection(@RequestBody OpenDbConnectionDto openConnection) {
        dbConnectorFacade.openConnection(openConnection);
    }

    /**
     * Removes an existing database connection.
     *
     * @param type connection type (e.g. {@code mongodb})
     * @param name connection name
     */
    @DeleteMapping("/{type}/{name}")
    void deleteConnection(@PathVariable String type, @PathVariable String name) {
        dbConnectorFacade.deleteConnection(type, name);
    }

    /**
     * Lists all active database connections sorted by name.
     *
     * @return sorted list of connection statuses
     */
    @GetMapping
    List<DbConnectionStatusDto> listConnections() {
        return dbConnectorFacade.listConnections();
    }
}
