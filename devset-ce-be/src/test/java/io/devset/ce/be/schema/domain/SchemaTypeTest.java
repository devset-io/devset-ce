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
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SchemaTypeTest {

    @Test
    void shouldParseSupportedSchemaTypes() {
        assertEquals(SchemaType.JSON, SchemaType.from("json"));
        assertEquals(SchemaType.PROTOBUF, SchemaType.from("protobuf"));
        assertEquals(SchemaType.JSON, SchemaType.from("JSON"));
        assertEquals(SchemaType.PROTOBUF, SchemaType.from("PROTOBUF"));
    }

    @Test
    void shouldReturnNullForNullableParserWhenValueMissing() {
        assertNull(SchemaType.fromNullable(null));
        assertNull(SchemaType.fromNullable(" "));
    }

    @Test
    void shouldRejectUnsupportedSchemaType() {
        WorkflowEngineException exception = assertThrows(WorkflowEngineException.class, () -> SchemaType.from("avro"));
        assertEquals("Unsupported schema type: avro", exception.getMessage());
    }
}
