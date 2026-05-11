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

import io.devset.ce.be.engine.application.steps.impl.send.SendEnvelopeBuilder;
import io.devset.ce.be.engine.application.steps.impl.send.SendEnvelopeBuilder.SendEnvelope;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SendEnvelopeBuilderTest {

    @Test
    void shouldExtractKeyFromEnvelopeMap() {
        LinkedHashMap<String, Object> event = new LinkedHashMap<>();
        event.put("header", Map.of("eventType", "CREATED"));
        event.put("key", "user-123");
        event.put("payload", Map.of("id", 1));

        SendEnvelope envelope = SendEnvelopeBuilder.from(event);

        assertEquals("user-123", envelope.key());
        assertEquals(Map.of("eventType", "CREATED"), envelope.headers());
        assertEquals(Map.of("id", 1), envelope.payload());
    }

    @Test
    void shouldReturnNullKeyWhenNotPresent() {
        LinkedHashMap<String, Object> event = new LinkedHashMap<>();
        event.put("header", Map.of());
        event.put("payload", Map.of("id", 1));

        SendEnvelope envelope = SendEnvelopeBuilder.from(event);

        assertNull(envelope.key());
    }

    @Test
    void shouldReturnNullKeyForNonMapValue() {
        SendEnvelope envelope = SendEnvelopeBuilder.from("raw-payload");

        assertNull(envelope.key());
        assertEquals(Map.of(), envelope.headers());
        assertEquals("raw-payload", envelope.payload());
    }
}
