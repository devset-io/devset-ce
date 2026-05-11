/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

/**
 * JPA entity for the workflow_schema table.
 */
@Entity
@Table(
        name = "workflow_schema",
        uniqueConstraints = @UniqueConstraint(name = "uk_workflow_schema_id_version", columnNames = {"schema_id", "schema_version"})
)
@Getter
@Setter
public class SchemaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schema_id", nullable = false, length = 200)
    private String schemaId;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @Column(name = "schema_type", length = 50)
    private String schemaType;

    @Convert(converter = ObjectJsonConverter.class)
    @Column(name = "schema", nullable = false, columnDefinition = "TEXT")
    private Object schemaJson;

    @Column(name = "schema_descriptor", columnDefinition = "TEXT")
    private String schemaDescriptor;

    @Column(name = "protobuf_root_message", length = 400)
    private String protobufRootMessage;

    @Version
    @Column(name = "entity_version", nullable = false)
    private long entityVersion;

    protected SchemaEntity() {
    }

    /**
     * Replaces schema content fields in-place for an existing entity.
     *
     * @param schemaType           the schema type external name
     * @param schemaJson           the schema body
     * @param schemaDescriptor     the schema descriptor
     * @param protobufRootMessage  the protobuf root message name, or null
     */
    public void replace(String schemaType, Object schemaJson, String schemaDescriptor, String protobufRootMessage) {
        this.schemaType = schemaType;
        this.schemaJson = schemaJson;
        this.schemaDescriptor = schemaDescriptor;
        this.protobufRootMessage = protobufRootMessage;
    }

    /**
     * Replaces schema content fields in-place without protobuf root message.
     *
     * @param schemaType       the schema type external name
     * @param schemaJson       the schema body
     * @param schemaDescriptor the schema descriptor
     */
    public void replace(String schemaType, Object schemaJson, String schemaDescriptor) {
        replace(schemaType, schemaJson, schemaDescriptor, null);
    }
}
