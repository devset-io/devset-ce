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

import java.util.List;

/**
 * Domain record describing the message-dispatch workspace: the set of open tabs and which one is
 * active. The workspace is a single shared record (this is a single-user application) that the
 * frontend owns authoritatively and replaces wholesale on every change.
 *
 * @param activeTabId id of the currently active tab; may be {@code null} when no tab is open
 * @param tabs        open tabs in display order; never {@code null} (normalized to an empty list)
 */
public record DispatchWorkspace(
        String activeTabId,
        List<DispatchTab> tabs
) {

    public DispatchWorkspace {
        activeTabId = activeTabId == null || activeTabId.isBlank() ? null : activeTabId;
        tabs = tabs == null ? List.of() : List.copyOf(tabs);
    }

    /**
     * Returns an empty workspace, used as the default when nothing has been persisted yet.
     *
     * @return a workspace with no active tab and no open tabs
     */
    public static DispatchWorkspace empty() {
        return new DispatchWorkspace(null, List.of());
    }
}
