/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import io.devset.ce.be.engine.infrastructure.ExecutionPlanRunRepository;
import io.devset.ce.be.engine.infrastructure.ExecutionPlanRunServiceImpl;
import io.devset.ce.be.kafka.application.dto.KafkaConnectionStatusDto;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.Message;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class DynamicKafkaProducerManagerImplTest {

    @Test
    void shouldConnectProducerWithoutCreatingConsumerStatus() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        manager.connect("local", "localhost:9092", null, null);

        List<KafkaConnectionStatusDto> statuses = manager.listConnections();
        KafkaConnectionStatusDto status = statuses.getFirst();
        assertEquals(1, statuses.size());
        assertEquals("local", status.name());
        assertEquals("localhost:9092", status.bootstrapServers());
        assertTrue(status.producerConnected());
        assertFalse(status.consumerConnected());
        assertFalse(status.authenticated());
    }

    @Test
    void shouldReuseProducerForSameConnectionConfig() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        manager.connect("local", "localhost:9092", null, null);
        KafkaTemplate<String, String> firstProducer = producers(manager).get("local");

        manager.connect("local", "localhost:9092", null, null);
        KafkaTemplate<String, String> secondProducer = producers(manager).get("local");

        assertSame(firstProducer, secondProducer);
    }

    @Test
    void shouldSendStringMessageUsingStringProducer() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        KafkaTemplate<String, String> producer = mock(KafkaTemplate.class);
        producers(manager).put("local", producer);

        manager.sendMessage("local", "topic-1", null, Map.of("object", "state"), "{\"id\":1}");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Message<String>> output = ArgumentCaptor.forClass(Message.class);
        verify(producer).send(output.capture());
        assertEquals("{\"id\":1}", output.getValue().getPayload());
        assertEquals("topic-1", output.getValue().getHeaders().get("kafka_topic"));
        assertEquals("state", output.getValue().getHeaders().get("object"));
    }

    @Test
    void shouldSendStringMessageWithKeyHeader() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        KafkaTemplate<String, String> producer = mock(KafkaTemplate.class);
        producers(manager).put("local", producer);

        manager.sendMessage("local", "topic-1", "my-key", Map.of(), "{\"id\":1}");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Message<String>> output = ArgumentCaptor.forClass(Message.class);
        verify(producer).send(output.capture());
        assertEquals("my-key", output.getValue().getHeaders().get("kafka_messageKey"));
    }

    @Test
    void shouldSendBinaryMessageUsingBinaryProducer() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        KafkaTemplate<String, byte[]> producer = mock(KafkaTemplate.class);
        binaryProducers(manager).put("local", producer);

        manager.sendBinaryMessage("local", "topic-1", null, Map.of("object", "state"), "{\"id\":1}".getBytes(StandardCharsets.UTF_8));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Message<byte[]>> output = ArgumentCaptor.forClass(Message.class);
        verify(producer).send(output.capture());
        assertArrayEquals("{\"id\":1}".getBytes(StandardCharsets.UTF_8), output.getValue().getPayload());
        assertEquals("topic-1", output.getValue().getHeaders().get("kafka_topic"));
        assertEquals("state", output.getValue().getHeaders().get("object"));
    }

    @Test
    void shouldRejectOverwriteWhenActiveRunUsesKafkaConnector() {
        ExecutionPlanRunRepository runRepository = new ExecutionPlanRunRepository();
        ExecutionPlanRunService runService = new ExecutionPlanRunServiceImpl(runRepository);
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(runService);
        manager.connect("local", "localhost:9092", null, null);
        runService.savePendingRun(
                "run-1",
                1,
                Set.of(new ExecutionPlanConnectorRef(ConnectionType.KAFKA, "local"))
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> manager.connect("local", "otherhost:9092", null, null)
        );

        assertEquals("Cannot overwrite Kafka connector while active runs use it: local", output.getMessage());
        assertEquals("localhost:9092", manager.listConnections().getFirst().bootstrapServers());
    }

    @Test
    void shouldRemoveExistingKafkaConnector() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        manager.connect("local", "localhost:9092", null, null);

        manager.remove("local");

        assertEquals(List.of(), manager.listConnections());
    }

    @Test
    void shouldRejectRemoveWhenKafkaConnectorDoesNotExist() {
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> manager.remove("missing")
        );

        assertEquals("Kafka connector not found: missing", output.getMessage());
    }

    @Test
    void shouldRejectRemoveWhenActiveRunUsesKafkaConnector() {
        ExecutionPlanRunRepository runRepository = new ExecutionPlanRunRepository();
        ExecutionPlanRunService runService = new ExecutionPlanRunServiceImpl(runRepository);
        DynamicKafkaProducerManagerImpl manager = new DynamicKafkaProducerManagerImpl(runService);
        manager.connect("local", "localhost:9092", null, null);
        runService.savePendingRun(
                "run-1",
                1,
                Set.of(new ExecutionPlanConnectorRef(ConnectionType.KAFKA, "local"))
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> manager.remove("local")
        );

        assertEquals("Cannot remove Kafka connector while active runs use it: local", output.getMessage());
        assertEquals("local", manager.listConnections().getFirst().name());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, KafkaTemplate<String, String>> producers(DynamicKafkaProducerManagerImpl manager) {
        return (Map<String, KafkaTemplate<String, String>>) ReflectionTestUtils.getField(manager, "producers");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, KafkaTemplate<String, byte[]>> binaryProducers(DynamicKafkaProducerManagerImpl manager) {
        return (Map<String, KafkaTemplate<String, byte[]>>) ReflectionTestUtils.getField(manager, "binaryProducers");
    }
}
