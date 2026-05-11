/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.api;

import io.devset.ce.be.singlerequest.api.dto.SingleRequestDto;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper converting between {@link SingleRequestDto} and
 * {@link SingleRequestDefinition}.
 */
@Mapper(componentModel = "spring")
public interface SingleRequestDtoMapper {

    /**
     * Converts an API request DTO into the domain record.
     *
     * @param request incoming DTO
     * @return domain record
     */
    SingleRequestDefinition toDomain(SingleRequestDto request);

    /**
     * Converts a domain record into the API response DTO.
     *
     * @param request domain record
     * @return response DTO
     */
    SingleRequestDto toResponse(SingleRequestDefinition request);
}
