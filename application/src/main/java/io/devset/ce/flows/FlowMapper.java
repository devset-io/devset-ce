/*
 * This file is part of Devset CE.
 *
 * Copyright (C) "2025" Dominik Martyniak
 *
 * Devset CE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Devset CE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Devset CE. If not, see <https://www.gnu.org/licenses/>.
 */

package io.devset.ce.flows;

import io.devset.ce.flows.dto.FlowConnectionDto;
import io.devset.ce.flows.dto.FlowDefinitionDto;
import io.devset.ce.flows.dto.FlowDto;
import io.devset.ce.flows.dto.FlowNodeDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FlowMapper {

    FlowDefinition toDomain(FlowDefinitionDto dto);

    FlowNode toDomain(FlowNodeDto dto);

    FlowConnection toDomain(FlowConnectionDto dto);

    FlowDto toDto(Flow domain);

    FlowDefinitionDto toDto(FlowDefinition dto);

    FlowNodeDto toDto(FlowNode dto);

    FlowConnectionDto toDto(FlowConnection dto);
}
