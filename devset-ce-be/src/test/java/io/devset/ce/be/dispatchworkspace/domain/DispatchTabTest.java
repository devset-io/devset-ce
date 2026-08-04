/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.domain;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DispatchTabTest {

    @Test
    void shouldKeepValuesForAFullyPopulatedTab() {
        var tab = new DispatchTab("id-1", "AAA", "req-a", "hist-7", "req-a", 2);

        assertEquals("id-1", tab.id());
        assertEquals("AAA", tab.collectionName());
        assertEquals("req-a", tab.singleRequestName());
        assertEquals("hist-7", tab.activeHistoryId());
        assertEquals("req-a", tab.title());
        assertEquals(2, tab.order());
    }

    @Test
    void shouldNormalizeBlankOptionalFieldsToNull() {
        var tab = new DispatchTab("id-1", "AAA", "req-a", "  ", "", 0);

        assertNull(tab.activeHistoryId());
        assertNull(tab.title());
    }

    @Test
    void shouldRejectBlankId() {
        assertThrows(WorkflowEngineException.class,
                () -> new DispatchTab(" ", "AAA", "req-a", null, null, 0));
    }

    @Test
    void shouldRejectBlankCollectionName() {
        assertThrows(WorkflowEngineException.class,
                () -> new DispatchTab("id-1", "", "req-a", null, null, 0));
    }

    @Test
    void shouldRejectBlankSingleRequestName() {
        assertThrows(WorkflowEngineException.class,
                () -> new DispatchTab("id-1", "AAA", null, null, null, 0));
    }
}
