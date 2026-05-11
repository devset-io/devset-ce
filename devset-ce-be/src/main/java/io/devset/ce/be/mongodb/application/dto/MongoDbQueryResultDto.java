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
import java.util.Map;

/**
 * Result of a MongoDB query execution.
 *
 * @param documents matching documents, each represented as a field-value map
 * @param count     total number of matching documents
 */
public record MongoDbQueryResultDto(
        List<Map<String, Object>> documents,
        long count
) {}
