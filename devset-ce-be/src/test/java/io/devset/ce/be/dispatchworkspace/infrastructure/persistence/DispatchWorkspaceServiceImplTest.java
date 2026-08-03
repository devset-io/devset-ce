/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.infrastructure.persistence;

import io.devset.ce.be.dispatchworkspace.domain.DispatchTab;
import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DispatchWorkspaceServiceImplTest {

    private final DispatchWorkspaceRepository repository = mock(DispatchWorkspaceRepository.class);
    private final DispatchWorkspaceEntityMapper mapper = mock(DispatchWorkspaceEntityMapper.class);

    private final DispatchWorkspaceServiceImpl service = new DispatchWorkspaceServiceImpl(repository, mapper);

    @Test
    void shouldReturnEmptyWorkspaceWhenNothingPersisted() {
        when(repository.findById(DispatchWorkspaceEntity.SINGLETON_ID)).thenReturn(Optional.empty());

        DispatchWorkspace result = service.get();

        assertTrue(result.tabs().isEmpty());
        assertNull(result.activeTabId());
    }

    @Test
    void shouldReturnMappedWorkspaceWhenPersisted() {
        var entity = new DispatchWorkspaceEntity();
        var domain = new DispatchWorkspace("id-1", List.of());
        when(repository.findById(DispatchWorkspaceEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));
        when(mapper.toDomain(entity)).thenReturn(domain);

        assertSame(domain, service.get());
    }

    @Test
    void shouldStampSingletonIdOnReplace() {
        var workspace = new DispatchWorkspace(
                "id-1",
                List.of(new DispatchTab("id-1", "col", "req-a", null, "A", 0))
        );
        var entity = new DispatchWorkspaceEntity();
        when(mapper.toEntity(workspace)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDomain(entity)).thenReturn(workspace);

        DispatchWorkspace result = service.replace(workspace);

        ArgumentCaptor<DispatchWorkspaceEntity> saved = ArgumentCaptor.forClass(DispatchWorkspaceEntity.class);
        verify(repository).save(saved.capture());
        assertEquals(DispatchWorkspaceEntity.SINGLETON_ID, saved.getValue().getId());
        assertSame(workspace, result);
    }
}