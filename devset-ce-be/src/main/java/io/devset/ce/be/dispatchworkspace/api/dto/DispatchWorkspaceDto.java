/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.api.dto;

import java.util.List;

/**
 * API DTO mirroring {@link io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace}.
 * Used for the workspace get/replace endpoints.
 *
 * @param activeTabId id of the currently active tab; may be {@code null}
 * @param tabs        open tabs in display order
 */
public record DispatchWorkspaceDto(
        String activeTabId,
        List<DispatchTabDto> tabs
) {
}
