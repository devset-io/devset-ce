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

import io.devset.ce.be.common.domain.DomainValidation;

/**
 * Domain record describing a single open tab in the message-dispatch workspace.
 * <p>
 * A tab is a thin pointer, not a copy of request parameters: the request payload lives in the
 * referenced {@code SingleRequest}. Scratch tabs (with no saved request) are kept client-side and
 * never reach the backend, so every persisted tab always references a saved request.
 *
 * @param id                stable client-generated tab identifier
 * @param collectionName    name of the collection owning the referenced single request
 * @param singleRequestName name of the referenced single request
 * @param activeHistoryId   id of the history entry currently viewed in the tab; may be {@code null}
 * @param title             optional display title; may be {@code null}
 * @param order             position of the tab in the tab bar
 */
public record DispatchTab(
        String id,
        String collectionName,
        String singleRequestName,
        String activeHistoryId,
        String title,
        int order
) {

    public DispatchTab {
        id = DomainValidation.requireText(id, "id");
        collectionName = DomainValidation.requireText(collectionName, "collectionName");
        singleRequestName = DomainValidation.requireText(singleRequestName, "singleRequestName");
        activeHistoryId = normalizeText(activeHistoryId);
        title = normalizeText(title);
    }

    private static String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
