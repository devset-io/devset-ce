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

package io.devset.ce.schemas;

import io.devset.ce.schemas.dto.NewSchemaDto;
import io.devset.ce.schemas.dto.PatchSchemaDto;
import io.devset.ce.schemas.dto.SchemaDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaFacade {

    private final SchemaRepository schemaRepository;
    private final SchemaMapper mapper;

    public SchemaDto save(NewSchemaDto dto) {
        var newSchema = schemaRepository.save(mapper.toDomain(dto));
        return mapper.toDto(newSchema);
    }

    public List<SchemaDto> findByType(SchemaType type) {
        return schemaRepository.findAllByType(type)
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public SchemaDto findById(String id) {
        return schemaRepository.findById(id).map(mapper::toDto).orElseThrow(); //TODO
    }

    public void update(PatchSchemaDto schemaDto) {
        schemaRepository.findById(schemaDto.id()).ifPresent(schema -> {
            var updated = schema.update(schemaDto.name(), schemaDto.payload());
            schemaRepository.save(updated);
        });
    }

    public void delete(String id) {
        this.schemaRepository.delete(id);
    }
}
