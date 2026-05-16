/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */
package io.devset.ce.be.common.persistence;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MapStringObjectJsonConverterTest {

    private final MapStringObjectJsonConverter converter = new MapStringObjectJsonConverter();

    @Test
    void shouldNormalizeNullColumnToEmptyMap() {
        Map<String, Object> result = converter.convertToEntityAttribute(null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void shouldNormalizeBlankColumnToEmptyMap() {
        Map<String, Object> result = converter.convertToEntityAttribute("   ");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void shouldReadJsonObjectPreservingInsertionOrder() {
        Map<String, Object> result = converter.convertToEntityAttribute("{\"z\":1,\"a\":\"two\",\"m\":true}");

        assertEquals(List.of("z", "a", "m"), List.copyOf(result.keySet()));
        assertEquals(1, result.get("z"));
        assertEquals("two", result.get("a"));
        assertEquals(true, result.get("m"));
    }

    @Test
    void shouldWriteNullMapAsEmptyJsonObject() {
        assertEquals("{}", converter.convertToDatabaseColumn(null));
    }

    @Test
    void shouldRoundTripPopulatedMap() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("userId", "u-1");
        input.put("retries", 3);

        String column = converter.convertToDatabaseColumn(input);
        Map<String, Object> roundTripped = converter.convertToEntityAttribute(column);

        assertEquals("u-1", roundTripped.get("userId"));
        assertEquals(3, roundTripped.get("retries"));
    }
}
