/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.infrastructure;

import com.mongodb.MongoException;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.bson.Document;
import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaRequestDto;
import io.devset.ce.be.mongodb.infrastructure.schema.MongoSchemaIntrospector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MongoDbFacadeImplTest {

    private final MongoClientFactory clientFactory = mock(MongoClientFactory.class);
    private final MongoConnectionRegistry registry = new MongoConnectionRegistry(clientFactory);
    private final MongoDbFacadeImpl facade = new MongoDbFacadeImpl(
            registry, mock(MongoSchemaIntrospector.class)
    );

    MongoDbFacadeImplTest() {
        when(clientFactory.create(any())).thenAnswer(invocation -> mock(MongoClient.class));
    }

    @Test
    void shouldRegisterConnectionConfig() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);

        List<MongoDbConnectionStatusDto> statuses = registry.listAll();
        assertEquals(1, statuses.size());
        MongoDbConnectionStatusDto status = statuses.getFirst();
        assertEquals("local", status.name());
        assertEquals("mongodb://localhost:27017", status.connectionString());
        assertTrue(status.connected());
        assertFalse(status.authenticated());
    }

    @Test
    void shouldRedactCredentialsInListedConnectionString() {
        registry.register("auth", "mongodb://user:secret@localhost:27017/db", "db", "user", "secret");

        MongoDbConnectionStatusDto status = registry.listAll().getFirst();
        assertEquals("mongodb://localhost:27017/db", status.connectionString());
    }

    @Test
    void shouldRegisterAuthenticatedConnection() {
        registry.register("auth-mongo", "mongodb://localhost:27017", "testdb", "user", "pass");

        MongoDbConnectionStatusDto status = registry.listAll().getFirst();
        assertTrue(status.authenticated());
    }

    @Test
    void shouldReuseConfigForSameParameters() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);

        assertEquals(1, registry.listAll().size());
    }

    @Test
    void shouldOverwriteConfigWithDifferentParameters() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);
        registry.register("local", "mongodb://remotehost:27017", "testdb", null, null);

        MongoDbConnectionStatusDto status = registry.listAll().getFirst();
        assertEquals("mongodb://remotehost:27017", status.connectionString());
    }

    @Test
    void shouldRemoveExistingConnection() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);

        registry.remove("local");

        assertEquals(List.of(), registry.listAll());
    }

    @Test
    void shouldRejectRemoveWhenConnectionDoesNotExist() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> registry.remove("missing")
        );

        assertEquals("MongoDB connector not found: missing", output.getMessage());
    }

    @Test
    void shouldRejectRequireWhenConnectionDoesNotExist() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> registry.requireClient("missing")
        );

        assertEquals("MongoDB connection not found: missing", output.getMessage());
    }

    @Test
    void shouldListConnectionsSortedByName() {
        registry.register("zulu", "mongodb://localhost:27017", "testdb", null, null);
        registry.register("alpha", "mongodb://localhost:27018", "testdb", null, null);

        List<MongoDbConnectionStatusDto> statuses = registry.listAll();

        assertEquals("alpha", statuses.get(0).name());
        assertEquals("zulu", statuses.get(1).name());
    }

    @Test
    void shouldWrapInvalidFilterJsonInWorkflowEngineException() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("any", "db", "col", "{not-json")
                )
        );

        assertEquals("Invalid MongoDB JSON in filter", output.getMessage());
    }

    @Test
    void shouldWrapInvalidProjectionJsonInWorkflowEngineException() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("any", "db", "col", "{}", "{not-json", null)
                )
        );

        assertEquals("Invalid MongoDB JSON in projection", output.getMessage());
    }

    @Test
    void shouldRejectQueryWhenConnectionDoesNotExist() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("missing", "db", "col", "{}")
                )
        );

        assertEquals("MongoDB connection not found: missing", output.getMessage());
    }

    @Test
    void shouldRejectQueryAgainstSystemDatabase() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("any", "admin", "users", "{}")
                )
        );

        assertEquals("Access to system database 'admin' is not allowed", output.getMessage());
    }

    @Test
    void shouldRejectQueryAgainstSystemCollection() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("any", "myapp", "system.users", "{}")
                )
        );

        assertEquals("Access to system collection 'system.users' is not allowed", output.getMessage());
    }

    @Test
    void shouldRejectListCollectionsForSystemDatabase() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.listCollections("any", "config")
        );

        assertEquals("Access to system database 'config' is not allowed", output.getMessage());
    }

    @Test
    void shouldRejectSchemaDiscoveryForSystemCollection() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.discoverSchema(new MongoDbSchemaRequestDto("any", "myapp", "system.indexes"))
        );

        assertEquals("Access to system collection 'system.indexes' is not allowed", output.getMessage());
    }

    @Test
    void shouldCapResultsAtOneDocument() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);
        MongoClient client = registry.requireClient("local");
        MongoDatabase database = mock(MongoDatabase.class);
        @SuppressWarnings("unchecked")
        MongoCollection<Document> collection = mock(MongoCollection.class);
        @SuppressWarnings("unchecked")
        FindIterable<Document> findIterable = mock(FindIterable.class);
        when(client.getDatabase("myapp")).thenReturn(database);
        when(database.getCollection("users")).thenReturn(collection);
        when(collection.find(any(Document.class))).thenReturn(findIterable);
        when(findIterable.limit(1)).thenReturn(findIterable);

        facade.executeQuery(new MongoDbQueryRequestDto("local", "myapp", "users", "{}", null, 9999));

        verify(findIterable).limit(1);
    }

    @Test
    void shouldRedactCredentialsInWrappedDriverError() {
        registry.register("local", "mongodb://localhost:27017", "testdb", null, null);
        MongoClient client = registry.requireClient("local");
        when(client.getDatabase("myapp"))
                .thenThrow(new MongoException("connection failed for mongodb://user:secret@host:27017/db"));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(new MongoDbQueryRequestDto("local", "myapp", "users", "{}"))
        );

        assertTrue(output.getMessage().contains("mongodb://host:27017/db"),
                "URI should remain in message after redaction: " + output.getMessage());
        assertFalse(output.getMessage().contains("secret"),
                "Password must be stripped from message: " + output.getMessage());
        assertNull(output.getCause(), "Driver cause must not be propagated to avoid leaking URI in stack");
    }

    @Test
    void shouldRejectFilterWithDisallowedOperator() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> facade.executeQuery(
                        new MongoDbQueryRequestDto("any", "db", "col", "{\"$where\": \"this.x == 1\"}")
                )
        );

        assertEquals("Disallowed MongoDB operator '$where' in filter", output.getMessage());
    }
}
