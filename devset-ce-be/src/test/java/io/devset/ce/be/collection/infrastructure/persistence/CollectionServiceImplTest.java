/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.infrastructure.persistence;

import io.devset.ce.be.collection.domain.CollectionDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CollectionServiceImplTest {

    private final CollectionRepository repository = mock(CollectionRepository.class);
    private final CollectionEntityMapper mapper = mock(CollectionEntityMapper.class);
    private final SingleRequestFacade singleRequestFacade = mock(SingleRequestFacade.class);

    private final CollectionServiceImpl service = new CollectionServiceImpl(repository, mapper, singleRequestFacade);

    @Test
    void shouldReturnTrueWhenCollectionExists() {
        when(repository.existsById("my-col")).thenReturn(true);

        assertTrue(service.exists("my-col"));
    }

    @Test
    void shouldReturnFalseWhenCollectionDoesNotExist() {
        when(repository.existsById("missing")).thenReturn(false);

        assertFalse(service.exists("missing"));
    }

    @Test
    void shouldCreateCollectionWhenNameIsUnique() {
        var definition = new CollectionDefinition("new-col", Map.of());
        var entity = collectionEntity("new-col");

        when(repository.existsById("new-col")).thenReturn(false);
        when(mapper.toEntity(definition)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDomain(entity)).thenReturn(definition);

        CollectionDefinition result = service.create(definition);

        assertEquals("new-col", result.collectionName());
        verify(repository).save(entity);
    }

    @Test
    void shouldThrowWhenCreatingDuplicateCollection() {
        var definition = new CollectionDefinition("existing", Map.of());
        when(repository.existsById("existing")).thenReturn(true);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.create(definition)
        );

        assertEquals("Collection already exists: existing", ex.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void shouldUpdateCollectionContextWhenCollectionExists() {
        var existing = collectionEntity("alpha");
        existing.setCollectionContext(Map.of("oldKey", "oldValue"));
        var nextContext = Map.<String, Object>of("userName", "alice", "retries", 3);
        var requested = new CollectionDefinition("alpha", nextContext);
        var expectedDomain = new CollectionDefinition("alpha", nextContext);

        when(repository.findById("alpha")).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        when(mapper.toDomain(existing)).thenReturn(expectedDomain);

        CollectionDefinition result = service.update(requested);

        assertEquals(nextContext, existing.getCollectionContext());
        assertEquals(expectedDomain, result);
        verify(repository).save(existing);
    }

    @Test
    void shouldThrowWhenUpdatingMissingCollection() {
        when(repository.findById("missing")).thenReturn(Optional.empty());

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.update(new CollectionDefinition("missing", Map.of("x", "y")))
        );

        assertEquals("Collection not found: missing", ex.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void shouldReturnCollectionByName() {
        var entity = collectionEntity("alpha");
        var definition = new CollectionDefinition("alpha", Map.of());

        when(repository.findById("alpha")).thenReturn(Optional.of(entity));
        when(mapper.toDomain(entity)).thenReturn(definition);

        CollectionDefinition result = service.get("alpha");

        assertEquals("alpha", result.collectionName());
    }

    @Test
    void shouldThrowWhenCollectionNotFound() {
        when(repository.findById("missing")).thenReturn(Optional.empty());

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.get("missing")
        );

        assertEquals("Collection not found: missing", ex.getMessage());
    }

    @Test
    void shouldReturnAllCollections() {
        var entityA = collectionEntity("alpha");
        var entityB = collectionEntity("beta");
        var defA = new CollectionDefinition("alpha", Map.of());
        var defB = new CollectionDefinition("beta", Map.of());

        when(repository.findAll()).thenReturn(List.of(entityA, entityB));
        when(mapper.toDomain(entityA)).thenReturn(defA);
        when(mapper.toDomain(entityB)).thenReturn(defB);

        List<CollectionDefinition> result = service.getAll();

        assertEquals(2, result.size());
        assertEquals("alpha", result.get(0).collectionName());
        assertEquals("beta", result.get(1).collectionName());
    }

    @Test
    void shouldReturnEmptyListWhenNoCollections() {
        when(repository.findAll()).thenReturn(List.of());

        List<CollectionDefinition> result = service.getAll();

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldRemoveCollectionWhenItExistsAndHasNoRequests() {
        when(repository.existsById("alpha")).thenReturn(true);
        when(singleRequestFacade.existsByCollectionName("alpha")).thenReturn(false);

        service.remove("alpha");

        verify(repository).deleteById("alpha");
    }

    @Test
    void shouldThrowWhenRemovingNonExistentCollection() {
        when(repository.existsById("missing")).thenReturn(false);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.remove("missing")
        );

        assertEquals("Collection not found: missing", ex.getMessage());
        verify(repository, never()).deleteById(any());
    }

    @Test
    void shouldThrowWhenRemovingCollectionWithSingleRequests() {
        when(repository.existsById("busy")).thenReturn(true);
        when(singleRequestFacade.existsByCollectionName("busy")).thenReturn(true);

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> service.remove("busy")
        );

        assertEquals("Collection cannot be removed because it still has single requests: busy", ex.getMessage());
        verify(repository, never()).deleteById(any());
    }

    private static CollectionEntity collectionEntity(String name) {
        CollectionEntity entity = new CollectionEntity();
        entity.setCollectionName(name);
        return entity;
    }
}
