/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure;

import io.devset.ce.be.workflow.application.WorkflowCatalog;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowRepository;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowRequestEntityMapper;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Database-backed implementation of {@link WorkflowCatalog}.
 * <p>
 * Lists and loads workflow definitions stored in the {@code workflow_dsl_request} table.
 * Names ending in {@code .json} are normalized (the suffix is stripped) before lookup.
 * Read operations are cached via {@link CacheNames}.
 */
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DbWorkflowCatalog implements WorkflowCatalog {

    private static final String JSON_SUFFIX = ".json";

    private final WorkflowRepository repository;
    private final WorkflowRequestEntityMapper mapper;

    @Override
    @Cacheable(cacheNames = CacheNames.WORKFLOW_CATALOG_NAMES)
    public List<String> listNames() {
        return repository.findAll()
                .stream()
                .map(mapper::toDomain)
                .map(Workflow::id)
                .sorted()
                .toList();
    }

    @Override
    @Cacheable(cacheNames = CacheNames.WORKFLOW_CATALOG_BY_NAME, key = "#name")
    public Workflow loadByName(String name) {
        String workflowId = normalizeName(name);
        return repository.findById(workflowId)
                .map(mapper::toDomain)
                .orElseThrow(() -> new WorkflowEngineException("Workflow not found in catalog: " + workflowId));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new WorkflowEngineException("Workflow name must not be blank");
        }
        String trimmed = name.trim();
        if (trimmed.endsWith(JSON_SUFFIX)) {
            return trimmed.substring(0, trimmed.length() - JSON_SUFFIX.length());
        }
        return trimmed;
    }
}
