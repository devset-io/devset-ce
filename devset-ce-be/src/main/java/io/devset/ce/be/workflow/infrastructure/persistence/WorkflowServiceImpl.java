/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure.persistence;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.workflow.application.WorkflowService;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * JPA-backed implementation of {@link WorkflowService}.
 * <p>
 * Persists workflow DSL requests and enforces business rules: unique identifiers on create,
 * path/body id consistency on update, existence checks on update and delete.
 * Mutating operations invalidate all workflow-related caches.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class WorkflowServiceImpl implements WorkflowService {

    private final WorkflowRepository repository;
    private final WorkflowRequestEntityMapper mapper;

    @Override
    @CacheEvict(
            cacheNames = {
                    CacheNames.WORKFLOW_BY_ID,
                    CacheNames.WORKFLOW_ALL,
                    CacheNames.WORKFLOW_CATALOG_BY_NAME,
                    CacheNames.WORKFLOW_CATALOG_NAMES
            },
            allEntries = true
    )
    public Workflow create(Workflow request) {
        if (repository.existsById(request.id())) {
            throw new WorkflowEngineException("Workflow DSL request already exists: " + request.id());
        }
        return mapper.toDomain(repository.save(mapper.toEntity(request)));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.WORKFLOW_BY_ID, key = "#workflowId")
    public Workflow getByWorkflowId(String workflowId) {
        return repository.findById(workflowId)
                .map(mapper::toDomain)
                .orElseThrow(() -> new WorkflowEngineException("Workflow DSL request not found: " + workflowId));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.WORKFLOW_ALL)
    public List<Workflow> findAll() {
        return repository.findAll()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    @CacheEvict(
            cacheNames = {
                    CacheNames.WORKFLOW_BY_ID,
                    CacheNames.WORKFLOW_ALL,
                    CacheNames.WORKFLOW_CATALOG_BY_NAME,
                    CacheNames.WORKFLOW_CATALOG_NAMES
            },
            allEntries = true
    )
    public Workflow update(String workflowId, Workflow request) {
        if (!workflowId.equals(request.id())) {
            throw new WorkflowEngineException("Path id must match body.id");
        }
        if (!repository.existsById(workflowId)) {
            throw new WorkflowEngineException("Workflow DSL request not found: " + workflowId);
        }
        return mapper.toDomain(repository.save(mapper.toEntity(request)));
    }

    @Override
    @CacheEvict(
            cacheNames = {
                    CacheNames.WORKFLOW_BY_ID,
                    CacheNames.WORKFLOW_ALL,
                    CacheNames.WORKFLOW_CATALOG_BY_NAME,
                    CacheNames.WORKFLOW_CATALOG_NAMES
            },
            allEntries = true
    )
    public void delete(String workflowId) {
        if (!repository.existsById(workflowId)) {
            throw new WorkflowEngineException("Workflow DSL request not found: " + workflowId);
        }
        repository.deleteById(workflowId);
    }
}
