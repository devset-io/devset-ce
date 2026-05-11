/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl.send;

import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Extracts a {@link SendEnvelope} from a raw event value.
 * <p>
 * If the value is a map containing both a {@code header} map and a {@code payload} key,
 * the header is extracted as the envelope headers and the payload is used as the message body.
 * Otherwise the entire value is treated as the payload with empty headers.
 * <p>
 * This matches the envelope format produced by {@code append-current-event} steps.
 */
public final class SendEnvelopeBuilder {

    private static final String HEADER = "header";
    private static final String PAYLOAD = "payload";
    private static final String KEY = ExecutionPlanStepHandler.KEY;

    private SendEnvelopeBuilder() {}

    /**
     * Builds a {@link SendEnvelope} from a raw event value.
     *
     * @param value raw event value from runtime state; may be a map with header/payload or any other type
     * @return extracted envelope with headers (possibly empty), key (possibly null) and payload
     */
    @SuppressWarnings("unchecked")
    public static SendEnvelope from(Object value) {
        if (value instanceof Map<?, ?> rawEventMap
                && rawEventMap.get(HEADER) instanceof Map<?, ?>
                && rawEventMap.get(PAYLOAD) != null) {
            Object rawKey = rawEventMap.get(KEY);
            String key = rawKey != null ? String.valueOf(rawKey) : null;
            return new SendEnvelope(
                    new LinkedHashMap<>((Map<String, Object>) rawEventMap.get(HEADER)),
                    key,
                    rawEventMap.get(PAYLOAD)
            );
        }
        return new SendEnvelope(Map.of(), null, value);
    }

    /**
     * Extracted header map, Kafka key and payload from a single event value.
     *
     * @param headers headers to include in the outbound message
     * @param key     Kafka message key; {@code null} means no key (round-robin partitioning)
     * @param payload message body; may be a {@code byte[]}, {@code Map}, or any serializable value
     */
    public record SendEnvelope(Map<String, Object> headers, String key, Object payload) {}
}
