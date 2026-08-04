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

/**
 * API DTO mirroring {@link io.devset.ce.be.dispatchworkspace.domain.DispatchTab}.
 *
 * @param id                stable client-generated tab identifier
 * @param collectionName    name of the collection owning the referenced single request
 * @param singleRequestName name of the referenced single request
 * @param activeHistoryId   id of the history entry currently viewed; may be {@code null}
 * @param title             optional display title; may be {@code null}
 * @param order             position of the tab in the tab bar
 */
public record DispatchTabDto(
        String id,
        String collectionName,
        String singleRequestName,
        String activeHistoryId,
        String title,
        int order
) {
}