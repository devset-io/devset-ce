/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.infrastructure.persistence;

import io.devset.ce.be.common.persistence.MapStringObjectJsonConverter;
import jakarta.persistence.Convert;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * JPA entity for the message_dispatch_collection table.
 */
@Entity
@Table(name = "message_dispatch_collection")
@Getter
@Setter
public class CollectionEntity {

    @Id
    @Column(name = "collection_name", nullable = false, updatable = false, length = 200)
    private String collectionName;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "collection_context_json", columnDefinition = "TEXT")
    private Map<String, Object> collectionContext;

    @Version
    @Column(name = "entity_version", nullable = false, columnDefinition = "INTEGER NOT NULL DEFAULT 0")
    private long entityVersion;

    protected CollectionEntity() {
    }
}
