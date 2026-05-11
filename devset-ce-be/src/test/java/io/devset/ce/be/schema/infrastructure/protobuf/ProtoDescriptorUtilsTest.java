/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.protobuf;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class ProtoDescriptorUtilsTest {

    @Test
    void shouldGenerateDescriptorBase64FromInput() {
        assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String input = """
                syntax = "proto3";

                message User {
                  string name = 1;
                  int32 age = 2;
                }
                """;

        String output = ProtoDescriptorUtils.generateDescriptorBase64(input);
        byte[] result = Base64.getDecoder().decode(output);

        assertFalse(output.isBlank());
        assertFalse(result.length == 0);
    }

    @Test
    void shouldFailWhenInputIsBlank() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> ProtoDescriptorUtils.generateDescriptorBase64(" ")
        );

        assertEquals("Proto schema must not be blank", output.getMessage());
    }

    @Test
    void shouldFailWhenInputHasInvalidProtoSyntax() {
        assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String input = """
                syntax = "proto3";
                message User {
                  string name = "nope";
                }
                """;

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> ProtoDescriptorUtils.generateDescriptorBase64(input)
        );

        assertFalse(output.getMessage().isBlank());
    }
}
