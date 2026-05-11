/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.infrastructure.schema;

import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaFieldDto;
import org.bson.Document;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MongoSchemaIntrospectorTest {

    private final MongoSchemaIntrospector introspector = new MongoSchemaIntrospector();

    @Test
    void shouldDiscoverFlatFields() {
        Document sample = Document.parse("""
                {"name": "Alice", "age": 30, "active": true}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        assertEquals(3, schema.size());
        assertEquals("name", schema.get(0).path());
        assertEquals("String", schema.get(0).type());
        assertEquals("age", schema.get(1).path());
        assertEquals("Integer", schema.get(1).type());
        assertEquals("active", schema.get(2).path());
        assertEquals("Boolean", schema.get(2).type());
    }

    @Test
    void shouldDiscoverNestedDocument() {
        Document sample = Document.parse("""
                {"address": {"city": "Warsaw", "zip": "00-001"}}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        assertEquals(1, schema.size());
        MongoDbSchemaFieldDto address = schema.getFirst();
        assertEquals("address", address.path());
        assertEquals("Document", address.type());
        assertEquals(2, address.children().size());
        assertEquals("address.city", address.children().get(0).path());
        assertEquals("String", address.children().get(0).type());
        assertEquals("address.zip", address.children().get(1).path());
    }

    @Test
    void shouldDiscoverDeeplyNestedDocument() {
        Document sample = Document.parse("""
                {"address": {"geo": {"lat": 52.23, "lng": 21.01}}}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        MongoDbSchemaFieldDto geo = schema.getFirst().children().getFirst();
        assertEquals("address.geo", geo.path());
        assertEquals("Document", geo.type());
        assertEquals("address.geo.lat", geo.children().get(0).path());
        assertEquals("Double", geo.children().get(0).type());
    }

    @Test
    void shouldDetectArrayType() {
        Document sample = Document.parse("""
                {"tags": ["a", "b"], "name": "test"}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        MongoDbSchemaFieldDto tags = schema.get(0);
        assertEquals("tags", tags.path());
        assertEquals("Array", tags.type());
        assertTrue(tags.children().isEmpty());
    }

    @Test
    void shouldHandleNullValue() {
        Document sample = Document.parse("""
                {"missing": null}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        assertEquals("Null", schema.getFirst().type());
    }

    @Test
    void shouldReturnEmptyChildrenForScalars() {
        Document sample = Document.parse("""
                {"name": "Alice"}
                """);

        List<MongoDbSchemaFieldDto> schema = introspector.buildSchema(sample);

        assertTrue(schema.getFirst().children().isEmpty());
    }
}
