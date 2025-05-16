package io.devset.ce.schemas.dto;

import io.devset.ce.schemas.SchemaType;

public record NewSchemaDto(
        SchemaType type,
        String name,
        String payload
) {
}