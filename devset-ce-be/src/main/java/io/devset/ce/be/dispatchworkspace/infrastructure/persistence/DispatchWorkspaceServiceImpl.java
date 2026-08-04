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

import io.devset.ce.be.dispatchworkspace.application.DispatchWorkspaceFacade;
import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * JPA-backed implementation of {@link DispatchWorkspaceFacade}.
 * <p>
 * Persists the whole workspace into a single row keyed by
 * {@link DispatchWorkspaceEntity#SINGLETON_ID}. Reads fall back to an empty workspace when the row
 * does not exist yet, so the first {@code GET} never fails.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DispatchWorkspaceServiceImpl implements DispatchWorkspaceFacade {

    private final DispatchWorkspaceRepository repository;
    private final DispatchWorkspaceEntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public DispatchWorkspace get() {
        return repository.findById(DispatchWorkspaceEntity.SINGLETON_ID)
                .map(mapper::toDomain)
                .orElseGet(DispatchWorkspace::empty);
    }

    @Override
    public DispatchWorkspace replace(DispatchWorkspace workspace) {
        DispatchWorkspaceEntity entity = mapper.toEntity(workspace);
        entity.setId(DispatchWorkspaceEntity.SINGLETON_ID);
        return mapper.toDomain(repository.save(entity));
    }
}
