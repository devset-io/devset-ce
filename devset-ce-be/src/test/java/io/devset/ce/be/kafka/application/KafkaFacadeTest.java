/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.application;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.kafka.application.dto.KafkaConnectionStatusDto;
import io.devset.ce.be.kafka.application.dto.KafkaSendMessageDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KafkaFacadeTest {

    private final DynamicKafkaProducerManager state = mock(DynamicKafkaProducerManager.class);
    private final KafkaTopicFetchService fetchService = mock(KafkaTopicFetchService.class);
    private final KafkaFacade object = new KafkaFacade(state, fetchService);

    @Test
    void shouldCreateProducer() {
        object.connect("object-1", "localhost:9092", "user", "pass");

        verify(state).connect("object-1", "localhost:9092", "user", "pass");
    }

    @Test
    void shouldSendMessage() {
        KafkaSendMessageDto input = new KafkaSendMessageDto(
                "object-1",
                "workflow-topic",
                "my-key",
                Map.of("trace-id", "t-1"),
                "{\"id\":1}"
        );

        object.send(input);

        verify(state).sendMessage("object-1", "workflow-topic", "my-key", Map.of("trace-id", "t-1"), "{\"id\":1}");
    }

    @Test
    void shouldReturnConnectionStatus() {
        when(state.listConnections()).thenReturn(
                List.of(new KafkaConnectionStatusDto("object-1", "localhost:9092", true, true, true))
        );

        List<KafkaConnectionStatusDto> output = object.listConnections();

        assertEquals(1, output.size());
        assertEquals("object-1", output.getFirst().name());
        assertEquals("localhost:9092", output.getFirst().bootstrapServers());
    }

    @Test
    void shouldDeleteProducer() {
        object.remove("object-1");

        verify(state).remove("object-1");
    }

    @Test
    void shouldHandleConnectionFailure() {
        doThrow(new WorkflowEngineException("boot failed"))
                .when(state).connect("object-1", "localhost:9092", null, null);

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.connect("object-1", "localhost:9092", null, null)
        );
        assertEquals("boot failed", output.getMessage());
    }
}
