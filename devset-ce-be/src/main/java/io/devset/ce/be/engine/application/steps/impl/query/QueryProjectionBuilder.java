/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl.query;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds a MongoDB projection document from a {@code select} configuration map.
 * <p>
 * Extracts the document field name from each select entry and creates a projection
 * that includes only those fields, excluding {@code _id}.
 */
@Component
@RequiredArgsConstructor
public final class QueryProjectionBuilder {

    private final ObjectMapper objectMapper;

    /**
     * Builds a projection JSON string from the select config.
     *
     * @param selectConfig select mapping (state path → field name or object with {@code field})
     * @return JSON projection string, or {@code null} if select is empty
     */
    public String build(Map<String, Object> selectConfig) {
        if (selectConfig.isEmpty()) {
            return null;
        }
        LinkedHashMap<String, Object> projection = new LinkedHashMap<>();
        boolean hasIdSubPath = false;
        for (Object value : selectConfig.values()) {
            String fieldName = QuerySelectApplier.extractFieldName(value);
            projection.put(fieldName, 1);
            if (fieldName.startsWith("_id.")) {
                hasIdSubPath = true;
            }
        }
        if (!hasIdSubPath) {
            projection.put("_id", 0);
        }
        try {
            return objectMapper.writeValueAsString(projection);
        } catch (JsonProcessingException e) {
            throw new WorkflowEngineException("Failed to serialize projection", e);
        }
    }
}
