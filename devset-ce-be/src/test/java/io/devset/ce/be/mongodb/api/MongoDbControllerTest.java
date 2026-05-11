/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.api;

import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MongoDbControllerTest {

    private final MongoDbFacade mongoDbFacade = mock(MongoDbFacade.class);
    private final MongoDbController controller = new MongoDbController(mongoDbFacade);

    @Test
    void shouldDelegateQueryToFacade() {
        MongoDbQueryRequestDto request = new MongoDbQueryRequestDto("local", "mydb", "users", "{}");
        MongoDbQueryResultDto expectedResult = new MongoDbQueryResultDto(
                List.of(Map.of("name", "John")), 1
        );
        when(mongoDbFacade.executeQuery(request)).thenReturn(expectedResult);

        MongoDbQueryResultDto output = controller.executeQuery(request);

        assertEquals(1, output.count());
        verify(mongoDbFacade).executeQuery(request);
    }
}
