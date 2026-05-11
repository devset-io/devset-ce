/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Single stage definition within a workflow DSL pipeline.
 * <p>
 * Each stage emits a named event and carries configuration driving loop, set-field,
 * wait, wire-format and schema behavior. Map fields are defensively copied; blank
 * {@code schemaId} values are normalized to {@code null}. The {@code stage} name is
 * required.
 *
 * @param stage         non-blank stage name
 * @param event         event name produced by this stage
 * @param source        optional source event path for copy-style stages
 * @param repeat        optional fixed repeat count
 * @param repeatWhile   optional condition evaluated before each iteration
 * @param repeatUntil   optional condition evaluated after each iteration
 * @param headers       headers assigned to the produced event
 * @param key           Kafka message key expression; {@code null} means no key (round-robin partitioning)
 * @param set           set-field assignments for the event payload
 * @param state         state assignments scoped to the stage
 * @param emit          emission directive or expression
 * @param waitDuration  ISO-8601 wait duration applied after the stage (serialized as {@code wait})
 * @param wireFormat    wire-format settings for serialized payloads
 * @param schemaId      optional schema identifier to enforce; normalized to {@code null} when blank
 * @param query         optional database query block with {@code connection}, {@code database},
 *                      {@code collection}, {@code find} and {@code select}
 */
public record Stage(
        String stage,
        String event,
        String source,
        Integer repeat,
        Map<String, Object> repeatWhile,
        Map<String, Object> repeatUntil,
        Map<String, Object> headers,
        Object key,
        Map<String, Object> set,
        Map<String, Object> state,
        Object emit,
        @JsonProperty("wait") String waitDuration,
        Map<String, Object> wireFormat,
        String schemaId,
        Map<String, Object> query
) {

    /**
     * Convenience constructor without wire-format, schema or query.
     */
    public Stage(
            String stage,
            String event,
            String source,
            Integer repeat,
            Map<String, Object> repeatWhile,
            Map<String, Object> repeatUntil,
            Map<String, Object> headers,
            Map<String, Object> set,
            Map<String, Object> state,
            Object emit,
            String waitDuration
    ) {
        this(stage, event, source, repeat, repeatWhile, repeatUntil, headers, null, set, state, emit, waitDuration, null, null, null);
    }

    /**
     * Convenience constructor without wire-format or query.
     */
    public Stage(
            String stage,
            String event,
            String source,
            Integer repeat,
            Map<String, Object> repeatWhile,
            Map<String, Object> repeatUntil,
            Map<String, Object> headers,
            Map<String, Object> set,
            Map<String, Object> state,
            Object emit,
            String waitDuration,
            String schemaId
    ) {
        this(stage, event, source, repeat, repeatWhile, repeatUntil, headers, null, set, state, emit, waitDuration, null, schemaId, null);
    }

    /**
     * Convenience constructor without query.
     */
    public Stage(
            String stage,
            String event,
            String source,
            Integer repeat,
            Map<String, Object> repeatWhile,
            Map<String, Object> repeatUntil,
            Map<String, Object> headers,
            Map<String, Object> set,
            Map<String, Object> state,
            Object emit,
            String waitDuration,
            Map<String, Object> wireFormat,
            String schemaId
    ) {
        this(stage, event, source, repeat, repeatWhile, repeatUntil, headers, null, set, state, emit, waitDuration, wireFormat, schemaId, null);
    }

    public Stage {
        if (stage == null || stage.isBlank()) {
            throw new WorkflowEngineException("pipeline.stage must not be null");
        }
        repeatWhile = repeatWhile == null ? Map.of() : new LinkedHashMap<>(repeatWhile);
        repeatUntil = repeatUntil == null ? Map.of() : new LinkedHashMap<>(repeatUntil);
        headers = headers == null ? Map.of() : new LinkedHashMap<>(headers);
        set = set == null ? Map.of() : new LinkedHashMap<>(set);
        state = state == null ? Map.of() : new LinkedHashMap<>(state);
        wireFormat = wireFormat == null ? Map.of() : new LinkedHashMap<>(wireFormat);
        schemaId = schemaId == null || schemaId.isBlank() ? null : schemaId;
        query = query == null ? Map.of() : new LinkedHashMap<>(query);
    }
}
