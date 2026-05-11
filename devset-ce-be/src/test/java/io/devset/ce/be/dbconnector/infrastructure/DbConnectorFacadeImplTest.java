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
import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DbConnectorFacadeImplTest {

    private final MongoDbFacade mongoDbFacade = mock(MongoDbFacade.class);
    private final DbConnectorStatusMapper statusMapper = Mappers.getMapper(DbConnectorStatusMapper.class);
    private final DbConnectorFacadeImpl facade = new DbConnectorFacadeImpl(mongoDbFacade, statusMapper);

    @Test
    void shouldRouteMongoDbConnection() {
        OpenDbConnectionDto dto = new OpenDbConnectionDto(
                DbConnectionType.MONGODB, "my-mongo", "mongodb://localhost:27017", "mydb", "user", "pass"
        );

        facade.openConnection(dto);

        verify(mongoDbFacade).connect("my-mongo", "mongodb://localhost:27017", "mydb", "user", "pass");
    }

    @Test
    void shouldRejectNullType() {
        OpenDbConnectionDto dto = new OpenDbConnectionDto(null, "name", "uri", "db", null, null);

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.openConnection(dto)
        );

        assertEquals("Database connection type must not be blank", output.getMessage());
    }

    @Test
    void shouldRejectBlankName() {
        OpenDbConnectionDto dto = new OpenDbConnectionDto(
                DbConnectionType.MONGODB, "", "mongodb://localhost:27017", "db", null, null
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.openConnection(dto)
        );

        assertEquals("Connection name must not be blank", output.getMessage());
    }

    @Test
    void shouldRejectBlankDatabase() {
        OpenDbConnectionDto dto = new OpenDbConnectionDto(
                DbConnectionType.MONGODB, "my-mongo", "mongodb://localhost:27017", "", "user", "pass"
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.openConnection(dto)
        );

        assertEquals("Database name must not be blank", output.getMessage());
    }

    @Test
    void shouldRouteMongoDbDelete() {
        facade.deleteConnection("mongodb", "my-mongo");

        verify(mongoDbFacade).remove("my-mongo");
    }

    @Test
    void shouldRejectBlankNameOnDelete() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.deleteConnection("mongodb", "")
        );

        assertEquals("Connection name must not be blank", output.getMessage());
    }

    @Test
    void shouldRejectUnsupportedTypeForDelete() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.deleteConnection("kafka", "name")
        );

        assertTrue(output.getMessage().contains("Unsupported database connection type"));
    }

    @Test
    void shouldListMongoDbConnections() {
        when(mongoDbFacade.listConnections()).thenReturn(
                List.of(new MongoDbConnectionStatusDto("my-mongo", "mongodb://localhost:27017", true, false))
        );

        List<DbConnectionStatusDto> output = facade.listConnections();

        assertEquals(1, output.size());
        DbConnectionStatusDto status = output.getFirst();
        assertEquals(DbConnectionType.MONGODB, status.type());
        assertEquals("my-mongo", status.name());
        assertEquals("mongodb://localhost:27017", status.connectionString());
        assertTrue(status.connected());
    }

    @Test
    void shouldReturnConnectionsSortedByName() {
        when(mongoDbFacade.listConnections()).thenReturn(
                List.of(
                        new MongoDbConnectionStatusDto("zulu", "mongodb://z:27017", true, false),
                        new MongoDbConnectionStatusDto("alpha", "mongodb://a:27017", true, false)
                )
        );

        List<DbConnectionStatusDto> output = facade.listConnections();

        assertEquals("alpha", output.get(0).name());
        assertEquals("zulu", output.get(1).name());
    }
}
