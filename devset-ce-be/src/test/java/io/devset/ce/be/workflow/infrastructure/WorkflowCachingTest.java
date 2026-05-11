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

import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.workflow.application.WorkflowCatalog;
import io.devset.ce.be.workflow.application.WorkflowService;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowRepository;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowRequestEntity;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowRequestEntityMapper;
import io.devset.ce.be.workflow.infrastructure.persistence.WorkflowServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(classes = WorkflowCachingTest.Config.class)
class WorkflowCachingTest {

    private static final String WORKFLOW_ALPHA = "workflow-alpha";
    private static final String WORKFLOW_BETA = "workflow-beta";

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        WorkflowRepository workflowRepository() {
            return mock(WorkflowRepository.class);
        }

        @Bean
        WorkflowRequestEntityMapper workflowRequestEntityMapper() {
            return org.mapstruct.factory.Mappers.getMapper(WorkflowRequestEntityMapper.class);
        }

        @Bean
        WorkflowService workflowService(WorkflowRepository workflowRepository, WorkflowRequestEntityMapper mapper) {
            return new WorkflowServiceImpl(workflowRepository, mapper);
        }

        @Bean
        WorkflowCatalog workflowCatalog(WorkflowRepository workflowRepository, WorkflowRequestEntityMapper mapper) {
            return new DbWorkflowCatalog(workflowRepository, mapper);
        }

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    CacheNames.WORKFLOW_BY_ID,
                    CacheNames.WORKFLOW_ALL,
                    CacheNames.WORKFLOW_CATALOG_BY_NAME,
                    CacheNames.WORKFLOW_CATALOG_NAMES
            );
        }
    }

    @jakarta.annotation.Resource
    private WorkflowService workflowService;

    @jakarta.annotation.Resource
    private WorkflowCatalog workflowCatalog;

    @jakarta.annotation.Resource
    private WorkflowRepository workflowRepository;

    @jakarta.annotation.Resource
    private WorkflowRequestEntityMapper mapper;

    @jakarta.annotation.Resource
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        reset(workflowRepository);
        clearCache(CacheNames.WORKFLOW_BY_ID);
        clearCache(CacheNames.WORKFLOW_ALL);
        clearCache(CacheNames.WORKFLOW_CATALOG_BY_NAME);
        clearCache(CacheNames.WORKFLOW_CATALOG_NAMES);
    }

    @Test
    void shouldUseCacheForWorkflowById() {
        when(workflowRepository.findById(WORKFLOW_ALPHA))
                .thenReturn(Optional.of(mapper.toEntity(sampleWorkflow(WORKFLOW_ALPHA))));

        workflowService.getByWorkflowId(WORKFLOW_ALPHA);
        workflowService.getByWorkflowId(WORKFLOW_ALPHA);

        verify(workflowRepository, times(1)).findById(WORKFLOW_ALPHA);
    }

    @Test
    void shouldUseCacheForCatalogNamesAndEvictOnWorkflowCreate() {
        when(workflowRepository.findAll())
                .thenReturn(List.of(mapper.toEntity(sampleWorkflow(WORKFLOW_ALPHA))));
        when(workflowRepository.existsById(WORKFLOW_BETA)).thenReturn(false);
        when(workflowRepository.save(any(WorkflowRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        workflowCatalog.listNames();
        workflowCatalog.listNames();
        workflowService.create(sampleWorkflow(WORKFLOW_BETA));
        workflowCatalog.listNames();

        verify(workflowRepository, times(2)).findAll();
    }

    @Test
    void shouldUseCacheForCatalogLoadByName() {
        when(workflowRepository.findById(WORKFLOW_ALPHA))
                .thenReturn(Optional.of(mapper.toEntity(sampleWorkflow(WORKFLOW_ALPHA))));

        workflowCatalog.loadByName(WORKFLOW_ALPHA);
        workflowCatalog.loadByName(WORKFLOW_ALPHA);

        verify(workflowRepository, times(1)).findById(WORKFLOW_ALPHA);
    }

    private Workflow sampleWorkflow(String id) {
        Stage stage = new Stage(
                "stage-1",
                "event-1",
                "none",
                1,
                Map.of(),
                Map.of(),
                Map.of(),
                Map.of(),
                Map.of("payload", "value"),
                true,
                null,
                Map.of(),
                null
        );
        return new Workflow(
                id,
                WorkflowMessageType.KAFKA,
                WorkflowContentType.JSON,
                "producer-1",
                "topic-1",
                null,
                null,
                null,
                1,
                Map.of("state", "value"),
                List.of(stage)
        );
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }
}
