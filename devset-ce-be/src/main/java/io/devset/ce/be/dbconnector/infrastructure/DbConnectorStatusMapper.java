/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.infrastructure;

import io.devset.ce.be.dbconnector.api.dto.DbConnectionStatusDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps MongoDB connection status to the unified DB connector status DTO.
 */
@Mapper(componentModel = "spring")
public interface DbConnectorStatusMapper {

    /**
     * Maps a MongoDB connection status to the unified DB connector status.
     *
     * @param mongo MongoDB connection status
     * @return unified DB connector status
     */
    @Mapping(target = "type", expression = "java(io.devset.ce.be.common.domain.DbConnectionType.MONGODB)")
    DbConnectionStatusDto fromMongo(MongoDbConnectionStatusDto mongo);
}
