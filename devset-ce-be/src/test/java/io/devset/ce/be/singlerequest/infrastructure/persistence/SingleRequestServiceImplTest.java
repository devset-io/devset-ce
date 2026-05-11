/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.infrastructure.persistence;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SingleRequestServiceImplTest {

    private final SingleRequestRepository repository = mock(SingleRequestRepository.class);
    private final SingleRequestEntityMapper mapper = mock(SingleRequestEntityMapper.class);
    private final SingleRequestServiceImpl service = new SingleRequestServiceImpl(repository, mapper);

    @Test
    void shouldReturnTrueWhenCollectionNameExists() {
        when(repository.existsByCollectionName("col-1")).thenReturn(true);

        assertTrue(service.existsByCollectionName("col-1"));
    }

    @Test
    void shouldReturnFalseWhenCollectionNameDoesNotExist() {
        when(repository.existsByCollectionName("col-1")).thenReturn(false);

        assertFalse(service.existsByCollectionName("col-1"));
    }

    @Test
    void shouldSaveNewSingleRequest() {
        SingleRequestDefinition request = sampleDefinition("req-1");
        SingleRequestEntity entity = mock(SingleRequestEntity.class);
        when(repository.existsById("req-1")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDomain(entity)).thenReturn(request);

        SingleRequestDefinition result = service.save(request);

        assertEquals("req-1", result.singleRequestName());
        verify(repository).save(entity);
    }

    @Test
    void shouldThrowWhenSavingDuplicateName() {
        SingleRequestDefinition request = sampleDefinition("req-1");
        when(repository.existsById("req-1")).thenReturn(true);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.save(request)
        );
        assertTrue(ex.getMessage().contains("already exists"));
    }

    @Test
    void shouldGetSingleRequestByName() {
        SingleRequestDefinition expected = sampleDefinition("req-1");
        SingleRequestEntity entity = mock(SingleRequestEntity.class);
        when(repository.findById("req-1")).thenReturn(Optional.of(entity));
        when(mapper.toDomain(entity)).thenReturn(expected);

        SingleRequestDefinition result = service.get("req-1");

        assertEquals("req-1", result.singleRequestName());
    }

    @Test
    void shouldThrowWhenGetNotFound() {
        when(repository.findById("missing")).thenReturn(Optional.empty());

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.get("missing")
        );
        assertTrue(ex.getMessage().contains("not found"));
    }

    @Test
    void shouldGetAllSingleRequests() {
        SingleRequestEntity entity = mock(SingleRequestEntity.class);
        SingleRequestDefinition definition = sampleDefinition("req-1");
        when(repository.findAll()).thenReturn(List.of(entity));
        when(mapper.toDomain(entity)).thenReturn(definition);

        List<SingleRequestDefinition> result = service.getAll();

        assertEquals(1, result.size());
        assertEquals("req-1", result.getFirst().singleRequestName());
    }

    @Test
    void shouldReturnEmptyListWhenNoSingleRequests() {
        when(repository.findAll()).thenReturn(List.of());

        List<SingleRequestDefinition> result = service.getAll();

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldPatchExistingSingleRequest() {
        SingleRequestDefinition request = sampleDefinition("req-1");
        SingleRequestEntity entity = mock(SingleRequestEntity.class);
        when(repository.existsById("req-1")).thenReturn(true);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDomain(entity)).thenReturn(request);

        SingleRequestDefinition result = service.patch("req-1", request);

        assertEquals("req-1", result.singleRequestName());
        verify(repository).save(entity);
    }

    @Test
    void shouldThrowWhenPatchNameMismatch() {
        SingleRequestDefinition request = sampleDefinition("req-2");

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.patch("req-1", request)
        );
        assertTrue(ex.getMessage().contains("must match"));
    }

    @Test
    void shouldThrowWhenPatchNotFound() {
        SingleRequestDefinition request = sampleDefinition("req-1");
        when(repository.existsById("req-1")).thenReturn(false);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.patch("req-1", request)
        );
        assertTrue(ex.getMessage().contains("not found"));
    }

    @Test
    void shouldRemoveExistingSingleRequest() {
        when(repository.existsById("req-1")).thenReturn(true);

        service.remove("req-1");

        verify(repository).deleteById("req-1");
    }

    @Test
    void shouldThrowWhenRemoveNotFound() {
        when(repository.existsById("req-1")).thenReturn(false);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.remove("req-1")
        );
        assertTrue(ex.getMessage().contains("not found"));
    }

    private SingleRequestDefinition sampleDefinition(String name) {
        return new SingleRequestDefinition(
                name, "collection-1", null, null,
                "producer-1", "topic-1", null, null,
                1, null, null,
                Map.of(), null, Map.of(), Map.of(), Map.of(), null
        );
    }
}
