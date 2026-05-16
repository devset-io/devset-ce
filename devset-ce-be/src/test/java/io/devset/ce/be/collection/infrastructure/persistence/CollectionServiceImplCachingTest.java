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
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
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

@SpringJUnitConfig(classes = CollectionServiceImplCachingTest.Config.class)
class CollectionServiceImplCachingTest {

    private static final String COLLECTION_ALPHA = "alpha";
    private static final String COLLECTION_BETA = "beta";

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        CollectionRepository collectionRepository() {
            return mock(CollectionRepository.class);
        }

        @Bean
        SingleRequestFacade singleRequestRepository() {
            return mock(SingleRequestFacade.class);
        }

        @Bean
        CollectionEntityMapper collectionEntityMapper() {
            return org.mapstruct.factory.Mappers.getMapper(CollectionEntityMapper.class);
        }

        @Bean
        CollectionFacade collectionService(
                CollectionRepository collectionRepository,
                CollectionEntityMapper collectionEntityMapper,
                SingleRequestFacade singleRequestRepository
        ) {
            return new CollectionServiceImpl(collectionRepository, collectionEntityMapper, singleRequestRepository);
        }

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    CacheNames.COLLECTION_BY_NAME,
                    CacheNames.COLLECTION_ALL
            );
        }
    }

    @jakarta.annotation.Resource
    private CollectionFacade collectionService;

    @jakarta.annotation.Resource
    private CollectionRepository collectionRepository;

    @jakarta.annotation.Resource
    private SingleRequestFacade singleRequestRepository;

    @jakarta.annotation.Resource
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        reset(collectionRepository, singleRequestRepository);
        clearCache(CacheNames.COLLECTION_BY_NAME);
        clearCache(CacheNames.COLLECTION_ALL);
    }

    @Test
    void shouldUseCacheForGetByName() {
        when(collectionRepository.findById(COLLECTION_ALPHA))
                .thenReturn(Optional.of(collectionEntity(COLLECTION_ALPHA)));

        collectionService.get(COLLECTION_ALPHA);
        collectionService.get(COLLECTION_ALPHA);

        verify(collectionRepository, times(1)).findById(COLLECTION_ALPHA);
    }

    @Test
    void shouldEvictGetByNameCacheOnCreate() {
        when(collectionRepository.findById(COLLECTION_ALPHA))
                .thenReturn(Optional.of(collectionEntity(COLLECTION_ALPHA)));
        when(collectionRepository.existsById(COLLECTION_BETA)).thenReturn(false);
        when(collectionRepository.save(any(CollectionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        collectionService.get(COLLECTION_ALPHA);
        collectionService.create(new CollectionDefinition(COLLECTION_BETA, Map.of()));
        collectionService.get(COLLECTION_ALPHA);

        verify(collectionRepository, times(2)).findById(COLLECTION_ALPHA);
    }

    @Test
    void shouldUseCacheForGetAllAndEvictOnRemove() {
        when(collectionRepository.findAll())
                .thenReturn(List.of(collectionEntity(COLLECTION_ALPHA)));
        when(collectionRepository.existsById(COLLECTION_BETA)).thenReturn(true);
        when(singleRequestRepository.existsByCollectionName(COLLECTION_BETA)).thenReturn(false);

        collectionService.getAll();
        collectionService.getAll();
        collectionService.remove(COLLECTION_BETA);
        collectionService.getAll();

        verify(collectionRepository, times(2)).findAll();
    }

    private static CollectionEntity collectionEntity(String name) {
        CollectionEntity entity = new CollectionEntity();
        entity.setCollectionName(name);
        return entity;
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }
}
