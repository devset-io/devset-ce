/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.domain;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CollectionDefinitionTest {

    @Test
    void shouldNormalizeNullContextToEmptyMap() {
        var definition = new CollectionDefinition("alpha", null);

        assertTrue(definition.collectionContext().isEmpty());
    }

    @Test
    void shouldAcceptNullEntryValuesInContext() {
        var input = new LinkedHashMap<String, Object>();
        input.put("userId", "u-1");
        input.put("optional", null);

        var definition = new CollectionDefinition("alpha", input);

        assertEquals("u-1", definition.collectionContext().get("userId"));
        assertTrue(definition.collectionContext().containsKey("optional"));
        assertNull(definition.collectionContext().get("optional"));
    }

    @Test
    void shouldPreserveInsertionOrderOfContextEntries() {
        var input = new LinkedHashMap<String, Object>();
        input.put("z", 1);
        input.put("a", 2);
        input.put("m", 3);

        var definition = new CollectionDefinition("alpha", input);

        assertEquals(java.util.List.of("z", "a", "m"),
                java.util.List.copyOf(definition.collectionContext().keySet()));
    }

    @Test
    void shouldReturnImmutableContextMap() {
        var definition = new CollectionDefinition("alpha", Map.of("k", "v"));

        assertThrows(UnsupportedOperationException.class,
                () -> definition.collectionContext().put("x", "y"));
    }

    @Test
    void shouldDecoupleFromCallerMapAfterConstruction() {
        var input = new LinkedHashMap<String, Object>();
        input.put("k", "v");

        var definition = new CollectionDefinition("alpha", input);
        input.put("k", "mutated");
        input.put("new", "added");

        assertEquals("v", definition.collectionContext().get("k"));
        assertEquals(1, definition.collectionContext().size());
    }
}
