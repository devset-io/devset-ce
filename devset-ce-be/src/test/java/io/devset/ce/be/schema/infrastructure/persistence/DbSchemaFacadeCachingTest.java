/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.workflow.application.WorkflowFacade;
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

@SpringJUnitConfig(classes = DbSchemaFacadeCachingTest.Config.class)
class DbSchemaFacadeCachingTest {

    private static final String SCHEMA_ALPHA = "schema-alpha";
    private static final String SCHEMA_BETA = "schema-beta";

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        SchemaRepository schemaRepository() {
            return mock(SchemaRepository.class);
        }

        @Bean
        WorkflowFacade workflowFacade() {
            return mock(WorkflowFacade.class);
        }

        @Bean
        SchemaEntityMapper schemaEntityMapper() {
            return org.mapstruct.factory.Mappers.getMapper(SchemaEntityMapper.class);
        }

        @Bean
        SchemaFacade schemaFacade(SchemaRepository schemaRepository, SchemaEntityMapper schemaEntityMapper, WorkflowFacade workflowFacade) {
            return new DbSchemaFacade(schemaRepository, schemaEntityMapper, workflowFacade);
        }

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    CacheNames.SCHEMA_LATEST_BY_ID,
                    CacheNames.SCHEMA_ALL
            );
        }
    }

    @jakarta.annotation.Resource
    private SchemaFacade schemaFacade;

    @jakarta.annotation.Resource
    private SchemaRepository schemaRepository;

    @jakarta.annotation.Resource
    private WorkflowFacade workflowFacade;

    @jakarta.annotation.Resource
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        reset(schemaRepository, workflowFacade);
        clearCache(CacheNames.SCHEMA_LATEST_BY_ID);
        clearCache(CacheNames.SCHEMA_ALL);
    }

    @Test
    void shouldUseCacheForLoadLatest() {
        when(schemaRepository.findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA))
                .thenReturn(Optional.of(schemaEntity(SCHEMA_ALPHA, 1, "json", Map.of("type", "object"))));

        schemaFacade.loadLatest(SCHEMA_ALPHA);
        schemaFacade.loadLatest(SCHEMA_ALPHA);

        verify(schemaRepository, times(1)).findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA);
    }

    @Test
    void shouldUseCacheForFindAllAndEvictOnCreate() {
        when(schemaRepository.findAllByOrderBySchemaIdAscSchemaVersionAsc())
                .thenReturn(List.of(schemaEntity(SCHEMA_ALPHA, 1, "json", Map.of("type", "object"))));
        when(schemaRepository.findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_BETA)).thenReturn(Optional.empty());
        when(schemaRepository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        schemaFacade.findAll();
        schemaFacade.findAll();
        schemaFacade.create(new SchemaDefinition(SCHEMA_BETA, null, SchemaType.JSON, Map.of("type", "object")));
        schemaFacade.findAll();

        verify(schemaRepository, times(2)).findAllByOrderBySchemaIdAscSchemaVersionAsc();
    }

    @Test
    void shouldEvictLoadLatestCacheOnReplace() {
        SchemaEntity existing = schemaEntity(SCHEMA_ALPHA, 1, "json", Map.of("type", "object"));
        when(schemaRepository.findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA))
                .thenReturn(Optional.of(existing));
        when(schemaRepository.save(any(SchemaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        schemaFacade.loadLatest(SCHEMA_ALPHA);
        schemaFacade.replace(new SchemaDefinition(SCHEMA_ALPHA, null, SchemaType.JSON, Map.of("type", "object", "id", "string")));
        schemaFacade.loadLatest(SCHEMA_ALPHA);

        verify(schemaRepository, times(3)).findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA);
    }

    @Test
    void shouldEvictLoadLatestCacheOnDelete() {
        SchemaEntity existing = schemaEntity(SCHEMA_ALPHA, 1, "json", Map.of("type", "object"));
        when(workflowFacade.listRequests()).thenReturn(List.of());
        when(schemaRepository.findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA))
                .thenReturn(Optional.of(existing));
        when(schemaRepository.findBySchemaId(SCHEMA_ALPHA)).thenReturn(Optional.of(existing));

        schemaFacade.loadLatest(SCHEMA_ALPHA);
        schemaFacade.delete(SCHEMA_ALPHA);
        schemaFacade.loadLatest(SCHEMA_ALPHA);

        verify(schemaRepository, times(2)).findFirstBySchemaIdOrderBySchemaVersionDesc(SCHEMA_ALPHA);
    }

    private static SchemaEntity schemaEntity(String schemaId, int version, String type, Object schemaJson) {
        SchemaEntity entity = new SchemaEntity();
        entity.setSchemaId(schemaId);
        entity.setSchemaVersion(version);
        entity.setSchemaType(type);
        entity.setSchemaJson(schemaJson);
        return entity;
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }
}
