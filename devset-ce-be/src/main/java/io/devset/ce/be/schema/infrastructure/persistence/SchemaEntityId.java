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

import java.io.Serializable;
import java.util.Objects;

/**
 * Composite primary key for {@link SchemaEntity}: a schema row is uniquely identified
 * by its logical schema id together with its version number.
 */
public class SchemaEntityId implements Serializable {

    private String schemaId;
    private Integer schemaVersion;

    public SchemaEntityId() {
    }

    public SchemaEntityId(String schemaId, Integer schemaVersion) {
        this.schemaId = schemaId;
        this.schemaVersion = schemaVersion;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof SchemaEntityId that)) {
            return false;
        }
        return Objects.equals(schemaId, that.schemaId) && Objects.equals(schemaVersion, that.schemaVersion);
    }

    @Override
    public int hashCode() {
        return Objects.hash(schemaId, schemaVersion);
    }
}
