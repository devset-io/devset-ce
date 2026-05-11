/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.application;

import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import io.devset.ce.be.rabbit.application.dto.RabbitConnectionStatusDto;
import io.devset.ce.be.rabbit.application.dto.RabbitSendMessageDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RabbitFacadeTest {

    @Test
    void shouldConnectUsingState() {
        DynamicRabbitProducerManager state = mock(DynamicRabbitProducerManager.class);
        RabbitFacade object = new RabbitFacade(state);

        object.connect("object-1", "localhost", 5672, "/", "user", "pass");

        verify(state).connect("object-1", "localhost", 5672, "/", "user", "pass");
    }

    @Test
    void shouldSendUsingState() {
        DynamicRabbitProducerManager state = mock(DynamicRabbitProducerManager.class);
        RabbitFacade object = new RabbitFacade(state);
        RabbitSendMessageDto input = new RabbitSendMessageDto(
                "object-1",
                "entity",
                "exchange",
                "entity",
                "{\"id\":1}"
        );

        object.send(input);

        verify(state).sendMessage("object-1", "entity", "exchange", "entity", "{\"id\":1}");
    }

    @Test
    void shouldRemoveUsingState() {
        DynamicRabbitProducerManager state = mock(DynamicRabbitProducerManager.class);
        RabbitFacade object = new RabbitFacade(state);

        object.remove("object-1");

        verify(state).remove("object-1");
    }

    @Test
    void shouldReturnOutputFromState() {
        DynamicRabbitProducerManager state = mock(DynamicRabbitProducerManager.class);
        RabbitFacade object = new RabbitFacade(state);
        when(state.listConnections()).thenReturn(
                List.of(new RabbitConnectionStatusDto("object-1", "localhost:5672/", true, false, true))
        );

        List<RabbitConnectionStatusDto> output = object.listConnections();

        assertEquals(1, output.size());
        assertEquals("object-1", output.getFirst().name());
    }

    @Test
    void shouldDelegateListBrokerResourcesToState() {
        DynamicRabbitProducerManager state = mock(DynamicRabbitProducerManager.class);
        RabbitFacade object = new RabbitFacade(state);
        RabbitBrokerResourcesDto expected = new RabbitBrokerResourcesDto(true, List.of("q1"), List.of("ex1"));
        when(state.listBrokerResources("object-1")).thenReturn(expected);

        RabbitBrokerResourcesDto output = object.listBrokerResources("object-1");

        assertEquals(expected, output);
        verify(state).listBrokerResources("object-1");
    }
}
