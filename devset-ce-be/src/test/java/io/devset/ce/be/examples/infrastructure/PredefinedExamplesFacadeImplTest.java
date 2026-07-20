/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.examples.infrastructure;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.collection.application.CollectionFacade;
import io.devset.ce.be.collection.domain.CollectionDefinition;
import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PredefinedExamplesFacadeImplTest {

    private final SchemaFacade schemaFacade = mock(SchemaFacade.class);
    private final WorkflowFacade workflowFacade = mock(WorkflowFacade.class);
    private final CollectionFacade collectionFacade = mock(CollectionFacade.class);
    private final SingleRequestFacade singleRequestFacade = mock(SingleRequestFacade.class);

    private final PredefinedExamplesFacadeImpl facade = new PredefinedExamplesFacadeImpl(
            schemaFacade,
            workflowFacade,
            collectionFacade,
            singleRequestFacade,
            new ObjectMapper());

    @Test
    void shouldCreateAllExamplesOnFreshInstance() {
        facade.seedFreshInstance();

        ArgumentCaptor<SchemaDefinition> schemas = ArgumentCaptor.forClass(SchemaDefinition.class);
        verify(schemaFacade, times(2)).create(schemas.capture());
        assertThat(schemas.getAllValues())
                .extracting(SchemaDefinition::id, SchemaDefinition::type)
                .containsExactly(
                        tuple("example-json-schema", SchemaType.JSON),
                        tuple("example-protobuf-schema", SchemaType.PROTOBUF));

        ArgumentCaptor<Workflow> workflow = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowFacade).createRequest(workflow.capture());
        assertThat(workflow.getValue().id()).isEqualTo("example-workflow");
        assertThat(workflow.getValue().schemaId()).isEqualTo("example-json-schema");
        assertThat(workflow.getValue().pipeline()).hasSize(3);

        verify(collectionFacade).create(new CollectionDefinition("examples", Map.of("status", "OPEN")));

        ArgumentCaptor<SingleRequestDefinition> requests = ArgumentCaptor.forClass(SingleRequestDefinition.class);
        verify(singleRequestFacade, times(2)).save(requests.capture());
        assertThat(requests.getAllValues())
                .extracting(SingleRequestDefinition::singleRequestName, SingleRequestDefinition::collectionName)
                .containsExactly(
                        tuple("example-json-message", "examples"),
                        tuple("example-protobuf-message", "examples"));
        assertThat(requests.getAllValues().get(1).protoSchema()).contains("message ExampleEntity");
    }

    @Test
    void shouldSkipSeedingWhenInstanceAlreadyContainsData() {
        when(schemaFacade.findAll()).thenReturn(List.of(
                new SchemaDefinition("user-schema", 1, SchemaType.JSON, Map.of("type", "object"), null)));

        facade.seedFreshInstance();

        verify(schemaFacade, never()).create(any());
        verify(workflowFacade, never()).createRequest(any());
        verify(collectionFacade, never()).create(any());
        verify(singleRequestFacade, never()).save(any());
    }

    @Test
    void shouldContinueWhenOneExampleFails() {
        doThrow(new WorkflowEngineException("schema store down"))
                .when(schemaFacade).create(any());

        assertThatCode(facade::seedFreshInstance).doesNotThrowAnyException();

        verify(workflowFacade).createRequest(any(Workflow.class));
        verify(collectionFacade).create(any(CollectionDefinition.class));
        verify(singleRequestFacade, times(2)).save(any(SingleRequestDefinition.class));
    }

    @Test
    void shouldSkipSeedingWhenWorkflowsAlreadyExist() {
        List<Workflow> existing = nonEmpty();
        when(workflowFacade.listRequests()).thenReturn(existing);

        facade.seedFreshInstance();

        verify(schemaFacade, never()).create(any());
        verify(workflowFacade, never()).createRequest(any());
    }

    @Test
    void shouldSkipSeedingWhenCollectionsAlreadyExist() {
        List<CollectionDefinition> existing = nonEmpty();
        when(collectionFacade.getAll()).thenReturn(existing);

        facade.seedFreshInstance();

        verify(schemaFacade, never()).create(any());
        verify(collectionFacade, never()).create(any());
    }

    @Test
    void shouldSkipSeedingWhenSingleRequestsAlreadyExist() {
        List<SingleRequestDefinition> existing = nonEmpty();
        when(singleRequestFacade.getAll()).thenReturn(existing);

        facade.seedFreshInstance();

        verify(schemaFacade, never()).create(any());
        verify(singleRequestFacade, never()).save(any());
    }

    @Test
    void shouldContinueWhenResourceCannotBeDeserialized() throws IOException {
        ObjectMapper failingMapper = mock(ObjectMapper.class);
        when(failingMapper.readValue(any(InputStream.class), any(Class.class)))
                .thenThrow(new IOException("stream broken"));
        when(failingMapper.readValue(any(InputStream.class), any(TypeReference.class)))
                .thenThrow(new IOException("stream broken"));
        PredefinedExamplesFacadeImpl failingFacade = new PredefinedExamplesFacadeImpl(
                schemaFacade, workflowFacade, collectionFacade, singleRequestFacade, failingMapper);

        assertThatCode(failingFacade::seedFreshInstance).doesNotThrowAnyException();

        verify(workflowFacade, never()).createRequest(any());
        verify(collectionFacade).create(any(CollectionDefinition.class));
    }

    @SuppressWarnings("unchecked")
    private static <T> List<T> nonEmpty() {
        List<T> list = mock(List.class);
        when(list.isEmpty()).thenReturn(false);
        return list;
    }
}
