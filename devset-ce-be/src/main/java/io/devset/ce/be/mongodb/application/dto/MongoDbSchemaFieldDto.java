/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.application.dto;

import java.util.List;

/**
 * Describes a single field discovered in a MongoDB collection.
 *
 * @param path     dot-notation path (e.g. {@code address.city})
 * @param type     BSON type name (e.g. {@code String}, {@code Integer}, {@code Document}, {@code Array})
 * @param children nested fields if type is {@code Document}; empty list otherwise
 */
public record MongoDbSchemaFieldDto(
        String path,
        String type,
        List<MongoDbSchemaFieldDto> children
) {}
