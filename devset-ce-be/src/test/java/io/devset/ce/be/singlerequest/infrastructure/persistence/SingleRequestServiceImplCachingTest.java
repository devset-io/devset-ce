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

import io.devset.ce.be.collection.application.CollectionFacade;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
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

@SpringJUnitConfig(classes = SingleRequestServiceImplCachingTest.Config.class)
class SingleRequestServiceImplCachingTest {

    private static final String REQUEST_ALPHA = "request-alpha";
    private static final String REQUEST_BETA = "request-beta";
    private static final String COLLECTION_ALPHA = "collection-alpha";

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        SingleRequestRepository singleRequestRepository() {
            return mock(SingleRequestRepository.class);
        }

        @Bean
        CollectionFacade collectionFacade() {
            return mock(CollectionFacade.class);
        }

        @Bean
        SingleRequestEntityMapper singleRequestEntityMapper() {
            return org.mapstruct.factory.Mappers.getMapper(SingleRequestEntityMapper.class);
        }

        @Bean
        SingleRequestFacade singleRequestService(
                SingleRequestRepository singleRequestRepository,
                SingleRequestEntityMapper singleRequestEntityMapper
        ) {
            return new SingleRequestServiceImpl(singleRequestRepository, singleRequestEntityMapper);
        }

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    CacheNames.SINGLE_REQUEST_BY_NAME,
                    CacheNames.SINGLE_REQUEST_ALL
            );
        }
    }

    @jakarta.annotation.Resource
    private SingleRequestFacade singleRequestService;

    @jakarta.annotation.Resource
    private SingleRequestRepository singleRequestRepository;

    @jakarta.annotation.Resource
    private CollectionFacade collectionFacade;

    @jakarta.annotation.Resource
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        reset(singleRequestRepository, collectionFacade);
        clearCache(CacheNames.SINGLE_REQUEST_BY_NAME);
        clearCache(CacheNames.SINGLE_REQUEST_ALL);
    }

    @Test
    void shouldUseCacheForGetByName() {
        when(singleRequestRepository.findById(REQUEST_ALPHA))
                .thenReturn(Optional.of(sampleEntity(REQUEST_ALPHA)));

        singleRequestService.get(REQUEST_ALPHA);
        singleRequestService.get(REQUEST_ALPHA);

        verify(singleRequestRepository, times(1)).findById(REQUEST_ALPHA);
    }

    @Test
    void shouldEvictGetByNameCacheOnSave() {
        when(singleRequestRepository.findById(REQUEST_ALPHA))
                .thenReturn(Optional.of(sampleEntity(REQUEST_ALPHA)));
        when(singleRequestRepository.existsById(REQUEST_BETA)).thenReturn(false);
        when(collectionFacade.exists(COLLECTION_ALPHA)).thenReturn(true);
        when(singleRequestRepository.save(any(SingleRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        singleRequestService.get(REQUEST_ALPHA);
        singleRequestService.save(sampleRequest(REQUEST_BETA));
        singleRequestService.get(REQUEST_ALPHA);

        verify(singleRequestRepository, times(2)).findById(REQUEST_ALPHA);
    }

    @Test
    void shouldUseCacheForGetAllAndEvictOnSave() {
        when(singleRequestRepository.findAll())
                .thenReturn(List.of(sampleEntity(REQUEST_ALPHA)));
        when(singleRequestRepository.existsById(REQUEST_BETA)).thenReturn(false);
        when(collectionFacade.exists(COLLECTION_ALPHA)).thenReturn(true);
        when(singleRequestRepository.save(any(SingleRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        singleRequestService.getAll();
        singleRequestService.getAll();
        singleRequestService.save(sampleRequest(REQUEST_BETA));
        singleRequestService.getAll();

        verify(singleRequestRepository, times(2)).findAll();
    }

    private static SingleRequestEntity sampleEntity(String name) {
        SingleRequestEntity entity = new SingleRequestEntity();
        entity.setSingleRequestName(name);
        entity.setCollectionName(COLLECTION_ALPHA);
        entity.setMessageType("kafka");
        entity.setContentType("application/json");
        entity.setProducerName("producer-1");
        entity.setTopic("topic-1");
        entity.setExecutions(1);
        entity.setStage("stage-1");
        entity.setEvent("event-1");
        entity.setState(Map.of("payload", "value"));
        entity.setHeaders(Map.of("header", "value"));
        entity.setWireFormat(Map.of());
        entity.setWorkflowState(Map.of());
        return entity;
    }

    private SingleRequestDefinition sampleRequest(String name) {
        return new SingleRequestDefinition(
                name,
                COLLECTION_ALPHA,
                WorkflowMessageType.KAFKA,
                WorkflowContentType.JSON,
                "producer-1",
                "topic-1",
                null,
                null,
                1,
                "stage-1",
                "event-1",
                Map.of("payload", "value"),
                null,
                Map.of("header", "value"),
                Map.of(),
                Map.of(),
                null
        );
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }
}
