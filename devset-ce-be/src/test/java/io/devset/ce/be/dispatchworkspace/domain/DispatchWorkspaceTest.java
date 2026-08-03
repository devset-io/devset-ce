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

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DispatchWorkspaceTest {

    private static DispatchTab tab(String id, int order) {
        return new DispatchTab(id, "AAA", "req-a", null, "req-a", order);
    }

    @Test
    void shouldNormalizeBlankActiveTabIdToNull() {
        var workspace = new DispatchWorkspace("  ", List.of());

        assertNull(workspace.activeTabId());
    }

    @Test
    void shouldNormalizeNullTabsToEmptyList() {
        var workspace = new DispatchWorkspace("id-1", null);

        assertTrue(workspace.tabs().isEmpty());
    }

    @Test
    void emptyShouldHaveNoActiveTabAndNoTabs() {
        var workspace = DispatchWorkspace.empty();

        assertNull(workspace.activeTabId());
        assertTrue(workspace.tabs().isEmpty());
    }

    @Test
    void shouldReturnImmutableTabsList() {
        var workspace = new DispatchWorkspace("id-1", List.of(tab("id-1", 0)));

        assertThrows(UnsupportedOperationException.class,
                () -> workspace.tabs().add(tab("id-2", 1)));
    }

    @Test
    void shouldDecoupleFromCallerListAfterConstruction() {
        var input = new ArrayList<DispatchTab>();
        input.add(tab("id-1", 0));

        var workspace = new DispatchWorkspace("id-1", input);
        input.add(tab("id-2", 1));

        assertEquals(1, workspace.tabs().size());
    }
}
