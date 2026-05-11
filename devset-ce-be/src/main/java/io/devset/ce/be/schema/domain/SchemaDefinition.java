/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.domain;

import io.devset.ce.be.common.domain.SchemaType;

/**
 * Domain record describing a versioned JSON or Protobuf schema.
 * <p>
 * Stores both the raw schema definition and, for protobuf schemas, the resolved
 * descriptor and root message name used by the engine at runtime.
 *
 * @param id                  unique schema identifier
 * @param version             monotonic schema version
 * @param type                schema type (JSON or Protobuf)
 * @param schema              raw schema contents (JSON tree or protobuf source text)
 * @param descriptor          Base64-encoded protobuf FileDescriptorSet;
 *                            {@code null} for JSON schemas
 * @param protobufRootMessage fully qualified protobuf root message name;
 *                            {@code null} for JSON schemas
 */
public record SchemaDefinition(
        String id,
        Integer version,
        SchemaType type,
        Object schema,
        String descriptor,
        String protobufRootMessage
) {

    /**
     * Convenience constructor without a protobuf root message.
     *
     * @param id         unique schema identifier
     * @param version    monotonic schema version
     * @param type       schema type
     * @param schema     raw schema contents
     * @param descriptor Base64-encoded protobuf descriptor; may be {@code null}
     */
    public SchemaDefinition(
            String id,
            Integer version,
            SchemaType type,
            Object schema,
            String descriptor
    ) {
        this(id, version, type, schema, descriptor, null);
    }

    /**
     * Convenience constructor without a descriptor or protobuf root message.
     *
     * @param id      unique schema identifier
     * @param version monotonic schema version
     * @param type    schema type
     * @param schema  raw schema contents
     */
    public SchemaDefinition(
            String id,
            Integer version,
            SchemaType type,
            Object schema
    ) {
        this(id, version, type, schema, null, null);
    }
}
