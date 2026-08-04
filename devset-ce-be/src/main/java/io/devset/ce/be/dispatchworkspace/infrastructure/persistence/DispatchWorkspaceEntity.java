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
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * JPA entity for the single-row message_dispatch_workspace table.
 * <p>
 * The application is single-user, so exactly one row (keyed by {@link #SINGLETON_ID}) holds the
 * whole workspace. The open tabs are stored as a JSON array in {@code tabs_json}.
 */
@Entity
@Table(name = "message_dispatch_workspace")
@Getter
@Setter
public class DispatchWorkspaceEntity {

    /** Fixed primary key of the single workspace row. */
    public static final String SINGLETON_ID = "default";

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 40)
    private String id;

    @Column(name = "active_tab_id", length = 64)
    private String activeTabId;

    @Convert(converter = DispatchTabListJsonConverter.class)
    @Column(name = "tabs_json", nullable = false, columnDefinition = "TEXT")
    private List<DispatchTab> tabs;

    protected DispatchWorkspaceEntity() {
    }
}
