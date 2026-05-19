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

import io.devset.ce.be.collection.application.CollectionFacade;
import io.devset.ce.be.collection.domain.CollectionDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * JPA-backed implementation of {@link CollectionFacade}.
 * <p>
 * Persists collections via Spring Data and invalidates cache entries on writes.
 * Business rules (duplicate detection, removal safety) are enforced here because
 * the port interface is implemented directly, without a separate service layer.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CollectionServiceImpl implements CollectionFacade {

    private final CollectionRepository repository;
    private final CollectionEntityMapper mapper;
    private final SingleRequestFacade singleRequestFacade;

    @Override
    @Transactional(readOnly = true)
    public boolean exists(String collectionName) {
        return repository.existsById(collectionName);
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.COLLECTION_BY_NAME, CacheNames.COLLECTION_ALL}, allEntries = true)
    public CollectionDefinition create(CollectionDefinition request) {
        if (repository.existsById(request.collectionName())) {
            throw new WorkflowEngineException("Collection already exists: " + request.collectionName());
        }
        return mapper.toDomain(repository.save(mapper.toEntity(request)));
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.COLLECTION_BY_NAME, CacheNames.COLLECTION_ALL}, allEntries = true)
    public CollectionDefinition update(CollectionDefinition request) {
        CollectionEntity existing = repository.findById(request.collectionName())
                .orElseThrow(() -> new WorkflowEngineException("Collection not found: " + request.collectionName()));
        existing.setCollectionContext(request.collectionContext());
        return mapper.toDomain(repository.save(existing));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.COLLECTION_BY_NAME, key = "#collectionName")
    public CollectionDefinition get(String collectionName) {
        return repository.findById(collectionName)
                .map(mapper::toDomain)
                .orElseThrow(() -> new WorkflowEngineException("Collection not found: " + collectionName));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.COLLECTION_ALL)
    public List<CollectionDefinition> getAll() {
        return repository.findAll()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.COLLECTION_BY_NAME, CacheNames.COLLECTION_ALL}, allEntries = true)
    public void remove(String collectionName) {
        if (!repository.existsById(collectionName)) {
            throw new WorkflowEngineException("Collection not found: " + collectionName);
        }
        if (singleRequestFacade.existsByCollectionName(collectionName)) {
            throw new WorkflowEngineException("Collection cannot be removed because it still has single requests: " + collectionName);
        }
        repository.deleteById(collectionName);
    }
}
