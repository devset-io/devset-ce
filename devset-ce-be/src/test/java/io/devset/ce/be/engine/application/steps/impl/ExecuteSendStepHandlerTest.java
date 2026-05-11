/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.engine.application.ExecutionPlanEventSender;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.PayloadBuilder;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.application.steps.impl.send.KafkaSendExecutor;
import io.devset.ce.be.engine.application.steps.impl.send.RabbitSendExecutor;
import io.devset.ce.be.engine.application.steps.impl.send.SendTargetResolver;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ExecuteSendStepHandlerTest {

    @Test
    void shouldSendBinaryWhenPayloadIsByteArray() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        ExecuteSendStepHandler object = handler(eventSender, mock(PayloadBuilder.class));
        byte[] payload = new byte[] {1, 2, 3};
        Map<String, Object> appendedEvent = new LinkedHashMap<>();
        appendedEvent.put("header", Map.of("eventType", "OPENED"));
        appendedEvent.put("payload", payload);
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, appendedEvent,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "send-1",
                StepType.EXECUTE_SEND,
                Map.of(
                        "messageType", "rabbit",
                        "contentType", "application/json",
                        "producerName", "local-rabbit",
                        "topic", "queue-1"
                ),
                "open"
        ), context);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> headersOutput = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<byte[]> payloadOutput = ArgumentCaptor.forClass(byte[].class);
        verify(eventSender).send(
                eq(WorkflowMessageType.RABBIT),
                eq(WorkflowContentType.JSON),
                eq("local-rabbit"),
                eq("queue-1"),
                isNull(),
                isNull(),
                isNull(),
                headersOutput.capture(),
                payloadOutput.capture()
        );
        assertEquals("OPENED", headersOutput.getValue().get("eventType"));
        assertArrayEquals(payload, payloadOutput.getValue());
    }

    @Test
    void shouldSendTextJsonMessage() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        when(payloadBuilder.toJson(eq(Map.of("id", 7)), anyString())).thenReturn("{\"id\":7}");
        ExecuteSendStepHandler object = handler(eventSender, payloadBuilder);
        ExecutionPlanRuntimeContext context = envelopeContext(Map.of("id", 7));

        object.handle(kafkaJsonStep("send-json"), context);

        verify(eventSender).send(
                eq(WorkflowMessageType.KAFKA),
                eq("local-kafka"),
                eq("workflow-topic"),
                isNull(),
                isNull(),
                isNull(),
                any(),
                eq("{\"id\":7}")
        );
        assertEquals(1, context.state().get(ExecutionStateKeys.META_LAST_SEND + ".count"));
        assertEquals("kafka", context.state().get(ExecutionStateKeys.META_LAST_SEND + ".messageType"));
        assertEquals("application/json", context.state().get(ExecutionStateKeys.META_LAST_SEND + ".contentType"));
        assertEquals(false, context.state().get(ExecutionStateKeys.META_LAST_SEND + ".simulated"));
    }

    @Test
    void shouldSendProtobufBinaryMessage() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        byte[] serialized = new byte[] {0x11, 0x22, 0x33};
        when(payloadBuilder.toProtobufBytes(
                eq(Map.of("id", 9)), eq("descriptor-bytes"), eq("example.Event"), anyString()
        )).thenReturn(serialized);
        ExecuteSendStepHandler object = handler(eventSender, payloadBuilder);
        ExecutionPlanRuntimeContext context = envelopeContext(Map.of("id", 9));

        object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "send-proto",
                StepType.EXECUTE_SEND,
                Map.of(
                        "messageType", "kafka",
                        "contentType", "application/x-protobuf",
                        "producerName", "local-kafka",
                        "topic", "workflow-topic",
                        "schemaDescriptor", "descriptor-bytes",
                        "protobufRootMessage", "example.Event"
                ),
                "open"
        ), context);

        verify(eventSender).send(
                eq(WorkflowMessageType.KAFKA),
                eq(WorkflowContentType.PROTOBUF),
                eq("local-kafka"),
                eq("workflow-topic"),
                isNull(),
                isNull(),
                isNull(),
                any(),
                eq(serialized)
        );
    }

    @Test
    void shouldSendBatchForListPayload() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        when(payloadBuilder.toJson(any(), anyString())).thenReturn("{}");
        ExecuteSendStepHandler object = handler(eventSender, payloadBuilder);
        List<Map<String, Object>> batch = List.of(
                Map.of("header", Map.of(), "payload", Map.of("id", 1)),
                Map.of("header", Map.of(), "payload", Map.of("id", 2)),
                Map.of("header", Map.of(), "payload", Map.of("id", 3))
        );
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, batch,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        object.handle(kafkaJsonStep("send-batch"), context);

        verify(eventSender, times(3))
                .send(eq(WorkflowMessageType.KAFKA), eq("local-kafka"), eq("workflow-topic"),
                        isNull(), isNull(), isNull(), any(), eq("{}"));
        assertEquals(3, context.state().get(ExecutionStateKeys.META_LAST_SEND + ".count"));
    }

    @Test
    void shouldPassKeyFromEnvelopeToKafkaSend() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        when(payloadBuilder.toJson(eq(Map.of("id", 5)), anyString())).thenReturn("{\"id\":5}");
        ExecuteSendStepHandler object = handler(eventSender, payloadBuilder);

        LinkedHashMap<String, Object> appendedEvent = new LinkedHashMap<>();
        appendedEvent.put("header", Map.of());
        appendedEvent.put("key", "partition-key");
        appendedEvent.put("payload", Map.of("id", 5));
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, appendedEvent,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        object.handle(kafkaJsonStep("send-key"), context);

        verify(eventSender).send(
                eq(WorkflowMessageType.KAFKA),
                eq("local-kafka"),
                eq("workflow-topic"),
                isNull(),
                isNull(),
                eq("partition-key"),
                any(),
                eq("{\"id\":5}")
        );
    }

    @Test
    void shouldSkipSendWhenInSimulationMode() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        ExecuteSendStepHandler object = handler(eventSender, mock(PayloadBuilder.class));
        LinkedHashMap<String, Object> appendedEvent = new LinkedHashMap<>();
        appendedEvent.put("header", Map.of());
        appendedEvent.put("payload", Map.of("id", 1));
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, appendedEvent,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                true
        );

        object.handle(kafkaJsonStep("send-sim"), context);

        verifyNoInteractions(eventSender);
        assertEquals(true, context.state().get(ExecutionStateKeys.META_LAST_SEND + ".simulated"));
        assertEquals(1, context.state().get(ExecutionStateKeys.META_LAST_SEND + ".count"));
    }

    @Test
    void shouldSkipWhenConditionFails() {
        ExecutionPlanEventSender eventSender = mock(ExecutionPlanEventSender.class);
        ExecuteSendStepHandler object = handler(eventSender, mock(PayloadBuilder.class));
        ExecutionPlanRuntimeContext context = envelopeContext(Map.of("id", 1));

        object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "send-skip",
                StepType.EXECUTE_SEND,
                Map.of(
                        "messageType", "kafka",
                        "contentType", "application/json",
                        "producerName", "local-kafka",
                        "topic", "workflow-topic",
                        "condition", Map.of("$fn", "eq(lastAppendedEvent.payload.id,9999)")
                ),
                "open"
        ), context);

        verifyNoInteractions(eventSender);
    }

    @Test
    void shouldThrowWhenKafkaTopicMissing() {
        ExecuteSendStepHandler object = handler(mock(ExecutionPlanEventSender.class), mock(PayloadBuilder.class));
        ExecutionPlanRuntimeContext context = envelopeContext(Map.of("id", 1));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "send-no-topic",
                        StepType.EXECUTE_SEND,
                        Map.of(
                                "messageType", "kafka",
                                "contentType", "application/json",
                                "producerName", "local-kafka"
                        ),
                        "open"
                ), context)
        );
        assertEquals("Missing config 'topic' for step: send-no-topic", output.getMessage());
    }

    @Test
    void shouldThrowWhenRabbitHasNoDestination() {
        ExecuteSendStepHandler object = handler(mock(ExecutionPlanEventSender.class), mock(PayloadBuilder.class));
        ExecutionPlanRuntimeContext context = envelopeContext(Map.of("id", 1));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "send-no-dest",
                        StepType.EXECUTE_SEND,
                        Map.of(
                                "messageType", "rabbit",
                                "contentType", "application/json",
                                "producerName", "local-rabbit"
                        ),
                        "open"
                ), context)
        );
        assertEquals(
                "Rabbit send requires topic (queue), routingKey or exchange for step: send-no-dest",
                output.getMessage()
        );
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition kafkaJsonStep(String id) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(
                id,
                StepType.EXECUTE_SEND,
                Map.of(
                        "messageType", "kafka",
                        "contentType", "application/json",
                        "producerName", "local-kafka",
                        "topic", "workflow-topic"
                ),
                "open"
        );
    }

    private ExecuteSendStepHandler handler(ExecutionPlanEventSender eventSender, PayloadBuilder payloadBuilder) {
        StepSupport stepSupport = new StepSupport();
        return new ExecuteSendStepHandler(
                new SendTargetResolver(stepSupport),
                new KafkaSendExecutor(eventSender, payloadBuilder),
                new RabbitSendExecutor(eventSender, payloadBuilder),
                new ConditionEvaluator()
        );
    }

    private ExecutionPlanRuntimeContext envelopeContext(Map<String, Object> payload) {
        LinkedHashMap<String, Object> appendedEvent = new LinkedHashMap<>();
        appendedEvent.put("header", Map.of("eventType", "CREATED"));
        appendedEvent.put("payload", payload);
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, appendedEvent,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
    }
}
