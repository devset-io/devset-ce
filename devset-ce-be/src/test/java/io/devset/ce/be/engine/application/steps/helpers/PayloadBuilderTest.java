/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.helpers;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtoDescriptorUtils;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtobufDescriptorServiceImpl;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PayloadBuilderTest {

    @Test
    void shouldBuildJsonPayloadAsBytes() {
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        String output = object.toJson(
                Map.of("userId", "1", "action", "OPEN"),
                "step-1"
        );

        assertFalse(output.isBlank());
    }

    @Test
    void shouldBuildProtobufPayloadAsBytes() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                  string action = 2;
                }
                """;
        String descriptor = ProtoDescriptorUtils.generateDescriptorBase64(schema);
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        byte[] output = object.toProtobufBytes(
                Map.of("userId", "1", "action", "OPEN"),
                descriptor,
                null,
                "step-1"
        );

        assertFalse(output.length == 0);
    }

    @Test
    void shouldBuildProtobufPayloadForNestedMessageDescriptorWhenSchemaIdMatchesRootMessage() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String schema = """
                syntax = "proto3";

                package example;

                message Envelope {
                  message Header {
                    string region = 1;
                  }

                  Header header = 1;
                }
                """;
        String descriptor = ProtoDescriptorUtils.generateDescriptorBase64(schema);
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        byte[] output = object.toProtobufBytes(
                Map.of("header", Map.of("region", "DevSet-1")),
                descriptor,
                null,
                "step-1"
        );

        assertFalse(output.length == 0);
    }

    @Test
    void shouldUseConfiguredRootMessageFromStepConfig() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                }

                message OrderEvent {
                  string orderId = 1;
                }
                """;
        String descriptor = ProtoDescriptorUtils.generateDescriptorBase64(schema);
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        byte[] output = object.toProtobufBytes(
                Map.of("orderId", "ORD-1"),
                descriptor,
                "example.OrderEvent",
                "step-1"
        );

        assertFalse(output.length == 0);
    }

    @Test
    void shouldBuildProtobufPayloadWhenSchemaHasMultipleTopLevelMessagesAndRootMessageIsMissing() {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                }

                message OrderEvent {
                  string orderId = 1;
                }
                """;
        String descriptor = ProtoDescriptorUtils.generateDescriptorBase64(schema);
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        byte[] output = object.toProtobufBytes(
                Map.of("userId", "USR-1"),
                descriptor,
                null,
                "step-1"
        );

        assertFalse(output.length == 0);
    }

    @Test
    void shouldFailWhenProtobufConfigIsMissing() {
        PayloadBuilder object = new PayloadBuilder(new ObjectMapper(), new ProtobufDescriptorServiceImpl());

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.toProtobufBytes(
                        Map.of("userId", "1"),
                        null,
                        null,
                        "step-1"
                )
        );

        assertEquals("Missing config 'schemaDescriptor' for protobuf send step: step-1", output.getMessage());
    }
}
