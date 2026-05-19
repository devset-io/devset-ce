/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.domain;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SingleStepExecutionRequestTest {

    @Test
    void shouldRejectRequestWhenSetIsEmpty() {
        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> buildRequest(Map.of("tenant", "acme"), Map.of())
        );

        assertEquals("set (event payload) must not be empty", exception.getMessage());
    }

    @Test
    void shouldKeepStateWhenSetIsProvided() {
        Map<String, Object> context = Map.of("tenant", "acme");
        Map<String, Object> payload = Map.of("payload", "x");

        SingleStepExecutionRequest request = buildRequest(context, payload);

        assertEquals(payload, request.set());
        assertEquals(context, request.state());
    }

    private SingleStepExecutionRequest buildRequest(Map<String, Object> state, Map<String, Object> set) {
        return new SingleStepExecutionRequest(
                "workflow-1",
                WorkflowMessageType.KAFKA,
                WorkflowContentType.JSON,
                "producer-1",
                "workflow-topic",
                null,
                null,
                1,
                "open",
                "started",
                state,
                set,
                null,
                Map.of(),
                Map.of(),
                Map.of(),
                null,
                null,
                null
        );
    }
}
