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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.application.steps.helpers.PayloadBuilder;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WireFormatStepHandlerTest {

    @Test
    void shouldWrapPayloadWithCodePrefix2Bytes() {
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        WireFormatStepHandler object = new WireFormatStepHandler(new StepSupport(), payloadBuilder, new ConditionEvaluator());
        LinkedHashMap<String, Object> lastAppended = new LinkedHashMap<>();
        lastAppended.put("payload", Map.of("id", 1));
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, lastAppended,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
        when(payloadBuilder.toProtobufBytes(eq(Map.of("id", 1)), eq("descriptor-opened"), eq("example.Event"), eq("wire-1")))
                .thenReturn(new byte[] {0x0A, 0x01});

        object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "wire-1",
                StepType.WIRE_FORMAT,
                Map.of(
                        "type", "binary-prefix",
                        "size", 2,
                        "source", "messageType",
                        "messageType", "rabbit",
                        "contentType", "application/x-protobuf",
                        "schemaDescriptor", "descriptor-opened",
                        "protobufRootMessage", "example.Event",
                        "sourcePath", "lastAppendedEvent.payload",
                        "targetPath", "lastAppendedEvent.payload"
                ),
                "open"
        ), context);

        byte[] payload = (byte[]) context.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload");
        byte[] output = new byte[] {0x00, 0x02, 0x0A, 0x01};
        assertArrayEquals(output, payload);
        assertEquals(2, context.state().get(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".prefixValue"));
        verify(payloadBuilder).toProtobufBytes(eq(Map.of("id", 1)), eq("descriptor-opened"), eq("example.Event"), eq("wire-1"));
    }

    @Test
    void shouldWrapPayloadWithManualMessagePrefix() {
        PayloadBuilder payloadBuilder = mock(PayloadBuilder.class);
        WireFormatStepHandler object = new WireFormatStepHandler(new StepSupport(), payloadBuilder, new ConditionEvaluator());
        LinkedHashMap<String, Object> lastAppended = new LinkedHashMap<>();
        lastAppended.put("payload", Map.of("id", 2));
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, lastAppended,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
        when(payloadBuilder.toProtobufBytes(eq(Map.of("id", 2)), eq("descriptor-opened"), eq(null), eq("wire-2")))
                .thenReturn(new byte[] {0x11, 0x22});

        object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "wire-2",
                StepType.WIRE_FORMAT,
                Map.of(
                        "type", "binary-prefix",
                        "size", 2,
                        "source", "messagePrefix",
                        "prefixValue", 513,
                        "contentType", "application/x-protobuf",
                        "schemaDescriptor", "descriptor-opened",
                        "sourcePath", "lastAppendedEvent.payload",
                        "targetPath", "lastAppendedEvent.payload"
                ),
                "open"
        ), context);

        byte[] payload = (byte[]) context.state().get(ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload");
        assertArrayEquals(new byte[] {0x02, 0x01, 0x11, 0x22}, payload);
        assertEquals(513, context.state().get(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".prefixValue"));
    }

    @Test
    void shouldFailWhenTypeIsMissing() {
        WireFormatStepHandler object = new WireFormatStepHandler(new StepSupport(), mock(PayloadBuilder.class), new ConditionEvaluator());
        ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, new LinkedHashMap<>(Map.of("payload", Map.of())),
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wire-1",
                        StepType.WIRE_FORMAT,
                        Map.of(),
                        "open"
                ), context)
        );
        assertEquals("Missing config 'type' for step: wire-1", output.getMessage());
    }

    @Test
    void shouldFailWhenTypeIsNotBinaryPrefix() {
        WireFormatStepHandler object = new WireFormatStepHandler(
                new StepSupport(), mock(PayloadBuilder.class), new ConditionEvaluator()
        );
        ExecutionPlanRuntimeContext context = contextWithEnvelope();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wire-type",
                        StepType.WIRE_FORMAT,
                        Map.of("type", "text-prefix"),
                        "open"
                ), context)
        );
        assertEquals("Unsupported wire format for step: wire-type -> text-prefix", output.getMessage());
    }

    @Test
    void shouldFailWhenSizeIsNotTwo() {
        WireFormatStepHandler object = new WireFormatStepHandler(
                new StepSupport(), mock(PayloadBuilder.class), new ConditionEvaluator()
        );
        ExecutionPlanRuntimeContext context = contextWithEnvelope();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wire-size",
                        StepType.WIRE_FORMAT,
                        Map.of("type", "binary-prefix", "size", 4),
                        "open"
                ), context)
        );
        assertEquals("Only 2-byte prefix is supported for step: wire-size", output.getMessage());
    }

    @Test
    void shouldFailWhenContentTypeIsNotProtobuf() {
        WireFormatStepHandler object = new WireFormatStepHandler(
                new StepSupport(), mock(PayloadBuilder.class), new ConditionEvaluator()
        );
        ExecutionPlanRuntimeContext context = contextWithEnvelope();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wire-ct",
                        StepType.WIRE_FORMAT,
                        Map.of(
                                "type", "binary-prefix",
                                "size", 2,
                                "source", "messageType",
                                "messageType", "kafka",
                                "contentType", "application/json"
                        ),
                        "open"
                ), context)
        );
        assertEquals("wire-format requires protobuf contentType for step: wire-ct", output.getMessage());
    }

    @Test
    void shouldFailWhenPrefixValueOutOfRange() {
        WireFormatStepHandler object = new WireFormatStepHandler(
                new StepSupport(), mock(PayloadBuilder.class), new ConditionEvaluator()
        );
        ExecutionPlanRuntimeContext context = contextWithEnvelope();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                        "wire-range",
                        StepType.WIRE_FORMAT,
                        Map.of(
                                "type", "binary-prefix",
                                "size", 2,
                                "source", "messagePrefix",
                                "prefixValue", 100_000,
                                "contentType", "application/x-protobuf"
                        ),
                        "open"
                ), context)
        );
        assertEquals("prefixValue must be in range 0..65535 for step: wire-range", output.getMessage());
    }

    private ExecutionPlanRuntimeContext contextWithEnvelope() {
        LinkedHashMap<String, Object> lastAppended = new LinkedHashMap<>();
        lastAppended.put("payload", Map.of());
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.LAST_APPENDED_EVENT, lastAppended,
                        ExecutionStateKeys.OUTPUT_EVENTS, new ArrayList<>()
                ))),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
    }
}
