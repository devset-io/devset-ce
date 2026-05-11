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

import io.devset.ce.be.common.domain.DbConnectionType;
import io.devset.ce.be.dbconnector.api.dto.DbConnectionStatusDto;
import io.devset.ce.be.dbconnector.api.dto.OpenDbConnectionDto;
import io.devset.ce.be.dbconnector.application.DbConnectorFacade;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DbConfigurationControllerTest {

    private final DbConnectorFacade dbConnectorFacade = mock(DbConnectorFacade.class);
    private final DbConfigurationController controller = new DbConfigurationController(dbConnectorFacade);

    @Test
    void shouldOpenMongoDbConnection() {
        OpenDbConnectionDto dto = new OpenDbConnectionDto(
                DbConnectionType.MONGODB, "my-mongo", "mongodb://localhost:27017", "mydb", "user", "pass"
        );

        controller.openConnection(dto);

        verify(dbConnectorFacade).openConnection(dto);
    }

    @Test
    void shouldDeleteMongoDbConnection() {
        controller.deleteConnection("mongodb", "my-mongo");

        verify(dbConnectorFacade).deleteConnection("mongodb", "my-mongo");
    }

    @Test
    void shouldListConnections() {
        DbConnectionStatusDto status = new DbConnectionStatusDto(
                DbConnectionType.MONGODB, "my-mongo", "mongodb://localhost:27017", true, false
        );
        when(dbConnectorFacade.listConnections()).thenReturn(List.of(status));

        List<DbConnectionStatusDto> output = controller.listConnections();

        assertEquals(List.of(status), output);
    }
}
