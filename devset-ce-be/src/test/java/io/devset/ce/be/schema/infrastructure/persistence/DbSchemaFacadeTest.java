/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtoDescriptorUtils;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DbSchemaFacadeTest {

    private final SchemaEntityMapper mapper = org.mapstruct.factory.Mappers.getMapper(SchemaEntityMapper.class);

    private DbSchemaFacade object(SchemaRepository repository) {
        WorkflowFacade workflowFacade = mock(WorkflowFacade.class);
        when(workflowFacade.listRequests()).thenReturn(List.of());
        return new DbSchemaFacade(repository, mapper, workflowFacade);
    }

    @Test
    void shouldCreateNewSchemaWhenIdDoesNotExist() {
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade facade = object(repository);
        SchemaDefinition request = new SchemaDefinition("customer-created", null, SchemaType.JSON, Map.of("type", "object"));

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("customer-created")).thenReturn(Optional.empty());
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition created = facade.create(request);

        assertEquals("customer-created", created.id());
        assertEquals(1, created.version());
        assertEquals(SchemaType.JSON, created.type());
        assertEquals(Map.of("type", "object"), created.schema());
        verify(repository).findFirstBySchemaIdOrderBySchemaVersionDesc("customer-created");
        verify(repository).save(any(SchemaEntity.class));
    }

    @Test
    void shouldReplaceExistingSchemaOnCreateWhenIdExists() {
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade facade = object(repository);
        SchemaEntity existing = schemaEntity("customer-created", 4, "json", Map.of("old", true));
        SchemaDefinition request = new SchemaDefinition("customer-created", null, SchemaType.JSON, Map.of("new", true));

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("customer-created")).thenReturn(Optional.of(existing));
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition created = facade.create(request);

        assertEquals("customer-created", created.id());
        assertEquals(4, created.version());
        assertEquals(SchemaType.JSON, created.type());
        assertEquals(Map.of("new", true), created.schema());
        verify(repository).save(existing);
    }

    @Test
    void shouldReplaceLatestSchemaById() {
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade facade = object(repository);
        SchemaEntity existing = schemaEntity("event-v1", 7, "json", Map.of("old", true));
        SchemaDefinition request = new SchemaDefinition("event-v1", null, null, Map.of("new", true), null);

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("event-v1")).thenReturn(Optional.of(existing));
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition replaced = facade.replace(request);

        assertEquals("event-v1", replaced.id());
        assertEquals(7, replaced.version());
        assertEquals(SchemaType.JSON, replaced.type());
        assertEquals(Map.of("new", true), replaced.schema());
        assertEquals(null, replaced.descriptor());
        verify(repository).save(existing);
    }

    @Test
    void shouldGenerateDescriptorForProtobufWhenMissing() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade object = object(repository);
        String schema = """
                syntax = "proto3";

                message UserEvent {
                  string userId = 1;
                }
                """;

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("UserEvent")).thenReturn(Optional.empty());
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition output = object.create(new SchemaDefinition("UserEvent", null, SchemaType.PROTOBUF, schema, null));

        assertEquals("UserEvent", output.id());
        assertEquals(1, output.version());
        assertEquals(SchemaType.PROTOBUF, output.type());
        assertEquals("UserEvent", output.protobufRootMessage());
        verify(repository).save(any(SchemaEntity.class));
        assertNotNull(output.descriptor());
        assertFalse(output.descriptor().isBlank());
        assertFalse(java.util.Base64.getDecoder().decode(output.descriptor()).length == 0);
    }

    @Test
    void shouldAutoDetectProtobufRootMessageWhenSingleTopLevelMessage() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade object = object(repository);
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                }
                """;

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("event-v1")).thenReturn(Optional.empty());
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition output = object.create(new SchemaDefinition("event-v1", null, SchemaType.PROTOBUF, schema, null));

        assertEquals("event-v1", output.id());
        assertEquals("example.UserEvent", output.protobufRootMessage());
    }

    @Test
    void shouldAutoSelectFirstTopLevelMessageWhenMultipleTopLevelMessagesAndRootIsMissing() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade object = object(repository);
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                }

                message OrderEvent {
                  string orderId = 1;
                }
                """;

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("events-v1")).thenReturn(Optional.empty());
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition output = object.create(new SchemaDefinition("events-v1", null, SchemaType.PROTOBUF, schema, null));

        assertEquals("events-v1", output.id());
        assertEquals("example.UserEvent", output.protobufRootMessage());
    }

    @Test
    void shouldIgnoreProvidedProtobufRootMessageAndUseFirstTopLevelMessage() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade object = object(repository);
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                }

                message OrderEvent {
                  string orderId = 1;
                }
                """;

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("events-v1")).thenReturn(Optional.empty());
        when(repository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDefinition output = object.create(
                new SchemaDefinition("events-v1", null, SchemaType.PROTOBUF, schema, null, "OrderEvent")
        );

        assertEquals("events-v1", output.id());
        assertEquals("example.UserEvent", output.protobufRootMessage());
    }

    @Test
    void shouldFailReplaceWhenSchemaDoesNotExist() {
        SchemaRepository repository = mock(SchemaRepository.class);
        DbSchemaFacade facade = object(repository);

        when(repository.findFirstBySchemaIdOrderBySchemaVersionDesc("missing")).thenReturn(Optional.empty());

        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> facade.replace(new SchemaDefinition("missing", null, SchemaType.JSON, Map.of("type", "object")))
        );

        assertEquals("Schema not found: missing", exception.getMessage());
    }

    @Test
    void shouldDeleteSchemaWhenItIsNotUsedByAnyWorkflow() {
        SchemaRepository repository = mock(SchemaRepository.class);
        WorkflowFacade workflowFacade = mock(WorkflowFacade.class);
        DbSchemaFacade facade = new DbSchemaFacade(repository, mapper, workflowFacade);
        SchemaEntity schemaEntity = schemaEntity("schema-1", 1, "json", Map.of("type", "object"));

        when(workflowFacade.listRequests()).thenReturn(List.of());
        when(repository.findBySchemaId("schema-1")).thenReturn(Optional.of(schemaEntity));

        facade.delete("schema-1");

        verify(repository).delete(schemaEntity);
    }

    @Test
    void shouldFailDeleteWhenSchemaIsUsedByWorkflowStage() {
        SchemaRepository repository = mock(SchemaRepository.class);
        WorkflowFacade workflowFacade = mock(WorkflowFacade.class);
        DbSchemaFacade facade = new DbSchemaFacade(repository, mapper, workflowFacade);

        Workflow workflowUsingSchema = new Workflow(
                "workflow-1",
                WorkflowMessageType.KAFKA,
                WorkflowContentType.JSON,
                "producer-1",
                "topic-1",
                null,
                null,
                null,
                1,
                Map.of(),
                List.of(new Stage(
                        "stage-1",
                        "event-1",
                        "none",
                        1,
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        true,
                        null,
                        Map.of(),
                        "schema-1"
                ))
        );

        when(workflowFacade.listRequests()).thenReturn(List.of(workflowUsingSchema));

        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> facade.delete("schema-1")
        );

        assertEquals("Schema cannot be removed because it is used by workflow: workflow-1", exception.getMessage());
    }

    private static SchemaEntity schemaEntity(String schemaId, int version, String type, Object schemaJson) {
        SchemaEntity entity = new SchemaEntity();
        entity.setSchemaId(schemaId);
        entity.setSchemaVersion(version);
        entity.setSchemaType(type);
        entity.setSchemaJson(schemaJson);
        return entity;
    }
}
