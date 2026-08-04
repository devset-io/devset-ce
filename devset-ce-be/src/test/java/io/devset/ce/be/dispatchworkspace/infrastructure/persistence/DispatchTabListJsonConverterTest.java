/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.infrastructure.persistence;

import io.devset.ce.be.dispatchworkspace.domain.DispatchTab;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DispatchTabListJsonConverterTest {

    private final DispatchTabListJsonConverter converter = new DispatchTabListJsonConverter();

    @Test
    void shouldRoundTripTabsThroughJson() {
        var tabs = List.of(
                new DispatchTab("id-1", "col", "req-a", "hist-1", "Request A", 0),
                new DispatchTab("id-2", "col", "req-b", null, null, 1)
        );

        String json = converter.convertToDatabaseColumn(tabs);
        List<DispatchTab> restored = converter.convertToEntityAttribute(json);

        assertEquals(tabs, restored);
    }

    @Test
    void shouldSerializeNullListAsEmptyArray() {
        assertEquals("[]", converter.convertToDatabaseColumn(null));
    }

    @Test
    void shouldReturnEmptyListForBlankColumn() {
        assertTrue(converter.convertToEntityAttribute("").isEmpty());
        assertTrue(converter.convertToEntityAttribute(null).isEmpty());
    }
}