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
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * JPA-backed implementation of {@link SingleRequestFacade}.
 * <p>
 * Persists single request definitions via Spring Data and invalidates cache entries on writes.
 * Business rules (duplicate detection, path/body identifier consistency) are enforced here because
 * the port interface is implemented directly, without a separate service layer.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SingleRequestServiceImpl implements SingleRequestFacade {

    private final SingleRequestRepository repository;
    private final SingleRequestEntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public boolean existsByCollectionName(String collectionName) {
        return repository.existsByCollectionName(collectionName);
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.SINGLE_REQUEST_BY_NAME, CacheNames.SINGLE_REQUEST_ALL}, allEntries = true)
    public SingleRequestDefinition save(SingleRequestDefinition request) {
        if (repository.existsById(request.singleRequestName())) {
            throw new WorkflowEngineException("Single request already exists: " + request.singleRequestName());
        }

        return mapper.toDomain(repository.save(mapper.toEntity(request)));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.SINGLE_REQUEST_BY_NAME, key = "#singleRequestName")
    public SingleRequestDefinition get(String singleRequestName) {
        return repository.findById(singleRequestName)
                .map(mapper::toDomain)
                .orElseThrow(() -> new WorkflowEngineException("Single request not found: " + singleRequestName));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.SINGLE_REQUEST_ALL)
    public List<SingleRequestDefinition> getAll() {
        return repository.findAll()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.SINGLE_REQUEST_BY_NAME, CacheNames.SINGLE_REQUEST_ALL}, allEntries = true)
    public SingleRequestDefinition patch(String singleRequestName, SingleRequestDefinition request) {
        if (!singleRequestName.equals(request.singleRequestName())) {
            throw new WorkflowEngineException("Path id must match body.singleRequestName");
        }
        if (!repository.existsById(singleRequestName)) {
            throw new WorkflowEngineException("Single request not found: " + singleRequestName);
        }

        return mapper.toDomain(repository.save(mapper.toEntity(request)));
    }

    @Override
    @CacheEvict(cacheNames = {CacheNames.SINGLE_REQUEST_BY_NAME, CacheNames.SINGLE_REQUEST_ALL}, allEntries = true)
    public void remove(String singleRequestName) {
        if (!repository.existsById(singleRequestName)) {
            throw new WorkflowEngineException("Single request not found: " + singleRequestName);
        }
        repository.deleteById(singleRequestName);
    }

}
