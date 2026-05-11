/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.infrastructure;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.kafka.application.KafkaFacade;
import io.devset.ce.be.rabbit.application.RabbitFacade;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BrokerExecutionPlanEventSenderTest {

    @Test
    void shouldSendKafkaJsonOutputAsString() {
        KafkaFacade state = mock(KafkaFacade.class);
        RabbitFacade output = mock(RabbitFacade.class);
        BrokerExecutionPlanEventSender object = new BrokerExecutionPlanEventSender(state, output);

        object.send(
                WorkflowMessageType.KAFKA,
                "object-1",
                "topic-1",
                null,
                null,
                "my-key",
                Map.of("object", "state"),
                "{\"id\":1}"
        );

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> headersOutput = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<String> payloadOutput = ArgumentCaptor.forClass(String.class);
        verify(state).sendMessage(
                org.mockito.ArgumentMatchers.eq("object-1"),
                org.mockito.ArgumentMatchers.eq("topic-1"),
                org.mockito.ArgumentMatchers.eq("my-key"),
                headersOutput.capture(),
                payloadOutput.capture()
        );
        assertEquals("{\"id\":1}", payloadOutput.getValue());
        assertEquals("state", headersOutput.getValue().get("object"));
    }

    @Test
    void shouldSendKafkaProtobufOutputAsBinary() {
        KafkaFacade state = mock(KafkaFacade.class);
        RabbitFacade output = mock(RabbitFacade.class);
        BrokerExecutionPlanEventSender object = new BrokerExecutionPlanEventSender(state, output);

        object.send(
                WorkflowMessageType.KAFKA,
                WorkflowContentType.PROTOBUF,
                "object-1",
                "topic-1",
                null,
                null,
                "my-key",
                Map.of("object", "state"),
                "{\"id\":1}".getBytes(StandardCharsets.UTF_8)
        );

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> headersOutput = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<byte[]> payloadOutput = ArgumentCaptor.forClass(byte[].class);
        verify(state).sendBinary(
                org.mockito.ArgumentMatchers.eq("object-1"),
                org.mockito.ArgumentMatchers.eq("topic-1"),
                org.mockito.ArgumentMatchers.eq("my-key"),
                headersOutput.capture(),
                payloadOutput.capture()
        );
        assertArrayEquals("{\"id\":1}".getBytes(StandardCharsets.UTF_8), payloadOutput.getValue());
        assertEquals("application/x-protobuf", headersOutput.getValue().get("content-type"));
    }

    @Test
    void shouldSendRabbitProtobufOutputAsBinary() {
        KafkaFacade state = mock(KafkaFacade.class);
        RabbitFacade output = mock(RabbitFacade.class);
        BrokerExecutionPlanEventSender object = new BrokerExecutionPlanEventSender(state, output);

        object.send(
                WorkflowMessageType.RABBIT,
                WorkflowContentType.PROTOBUF,
                "object-1",
                "queue-1",
                null,
                null,
                null,
                Map.of("object", "state"),
                "{\"id\":1}".getBytes(StandardCharsets.UTF_8)
        );

        ArgumentCaptor<byte[]> stateOutput = ArgumentCaptor.forClass(byte[].class);
        verify(output).sendBinary(
                org.mockito.ArgumentMatchers.eq("object-1"),
                org.mockito.ArgumentMatchers.eq("queue-1"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                stateOutput.capture(),
                org.mockito.ArgumentMatchers.eq("application/x-protobuf")
        );
        assertArrayEquals("{\"id\":1}".getBytes(StandardCharsets.UTF_8), stateOutput.getValue());
    }

    @Test
    void shouldSendRabbitJsonOutputAsString() {
        KafkaFacade state = mock(KafkaFacade.class);
        RabbitFacade output = mock(RabbitFacade.class);
        BrokerExecutionPlanEventSender object = new BrokerExecutionPlanEventSender(state, output);

        object.send(
                WorkflowMessageType.RABBIT,
                "object-1",
                "queue-1",
                null,
                null,
                null,
                Map.of("object", "state"),
                "{\"id\":1}"
        );

        ArgumentCaptor<String> valueOutput = ArgumentCaptor.forClass(String.class);
        verify(output).sendMessage(
                org.mockito.ArgumentMatchers.eq("object-1"),
                org.mockito.ArgumentMatchers.eq("queue-1"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                valueOutput.capture()
        );
        assertEquals("{\"id\":1}", valueOutput.getValue());
    }

    @Test
    void shouldSendRabbitJsonOutputViaExchangeAndRoutingKey() {
        KafkaFacade state = mock(KafkaFacade.class);
        RabbitFacade output = mock(RabbitFacade.class);
        BrokerExecutionPlanEventSender object = new BrokerExecutionPlanEventSender(state, output);

        object.send(
                WorkflowMessageType.RABBIT,
                "object-1",
                null,
                "events.exchange",
                "entity.opened",
                null,
                Map.of("object", "state"),
                "{\"id\":1}"
        );

        ArgumentCaptor<String> valueOutput = ArgumentCaptor.forClass(String.class);
        verify(output).sendMessage(
                org.mockito.ArgumentMatchers.eq("object-1"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("events.exchange"),
                org.mockito.ArgumentMatchers.eq("entity.opened"),
                valueOutput.capture()
        );
        assertEquals("{\"id\":1}", valueOutput.getValue());
    }
}
