/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.infrastructure;

import io.devset.ce.be.common.domain.DbConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.dbconnector.api.dto.DbConnectionStatusDto;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;
import io.devset.ce.be.dbconnector.application.DbConnectorFacade;
import io.devset.ce.be.mongodb.application.MongoDbFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/**
 * Infrastructure implementation of {@link DbConnectorFacade}.
 * <p>
 * Routes operations to database-specific facades based on the connection type.
 * Currently supports MongoDB; additional databases will be added as new facades.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DbConnectorFacadeImpl implements DbConnectorFacade {

    private final MongoDbFacade mongoDbFacade;
    private final DbConnectorStatusMapper statusMapper;

    @Override
    public void openConnection(OpenDbConnectionDto openConnection) {
        if (openConnection.type() == null) {
            throw new WorkflowEngineException("Database connection type must not be blank");
        }
        if (openConnection.name() == null || openConnection.name().isBlank()) {
            throw new WorkflowEngineException("Connection name must not be blank");
        }
        if (openConnection.database() == null || openConnection.database().isBlank()) {
            throw new WorkflowEngineException("Database name must not be blank");
        }
        switch (openConnection.type()) {
            case MONGODB -> mongoDbFacade.connect(
                    openConnection.name(),
                    openConnection.connectionString(),
                    openConnection.database(),
                    openConnection.username(),
                    openConnection.password()
            );
        }
    }

    @Override
    public void deleteConnection(String type, String name) {
        DbConnectionType connectionType = DbConnectionType.from(type);
        if (name == null || name.isBlank()) {
            throw new WorkflowEngineException("Connection name must not be blank");
        }
        switch (connectionType) {
            case MONGODB -> mongoDbFacade.remove(name);
        }
    }

    @Override
    public List<DbConnectionStatusDto> listConnections() {
        return mongoDbFacade.listConnections()
                .stream()
                .map(statusMapper::fromMongo)
                .sorted(Comparator.comparing(DbConnectionStatusDto::name))
                .toList();
    }
}
