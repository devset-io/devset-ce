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

package io.devset.ce.flows.jpa;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.flows.*;
import io.devset.ce.flows.jpa.entities.*;
import lombok.SneakyThrows;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;


@Mapper(componentModel = "spring")
public abstract class FlowJpaMapper {

    @Autowired
    protected ObjectMapper objectMapper;

    abstract Flow toFlow(FlowDefinitionEntity entity);

    @Mapping(target = "providerMetadata",ignore = true)
    abstract FlowDefinitionEntity toEntity(FlowDefinition domain);

    abstract FieldRuleEntity toEntity(FieldRule domain, String flowRuleId);

    abstract FlowNodeEntity toEntity(FlowNode domain);

    abstract FlowConnectionEntity toEntity(FlowConnection domain);

    @SneakyThrows
    @AfterMapping
    void afterMapping(@MappingTarget FlowDefinitionEntity entity, FlowDefinition domain) {
        var json  = objectMapper.writeValueAsString(domain.getProviderMetadata());
        entity.setProviderMetadata(json);
        entity.getNodes().forEach(node -> node.setFlowDefinition(entity));
        entity.getConnections().forEach(connection -> {
            domain.getConnections().stream().filter(it -> it.getId().equals(connection.getId())).findFirst().ifPresent(el -> {
                connection.setFlowDefinition(entity);
                connection.setSourceId(el.getSourceId());
                connection.setTargetId(el.getTargetId());
            });

        });
    }

    @Mapping(target = "providerMetadata", expression = "java(jsonFlowMetadata(domain.getProviderMetadata()))")
    abstract FlowDefinition toDomain(FlowDefinitionEntity domain, Map<String, FlowRule> rules);

    abstract FieldRule toDomain(FieldRuleEntity entity);

    abstract FlowNode toDomain(FlowNodeEntity entity);

    abstract FlowConnection toDomain(FlowConnectionEntity entity);


    @Named("jsonFlowMetadata")
    ProviderMetaData jsonFlowMetadata(String providerMetadata) {
        try {
            if (providerMetadata == null) return null;
            return objectMapper.readValue(providerMetadata, ProviderMetaData.class);
        } catch (Exception e) {
            throw new RuntimeException("Error parsing JSON to Map", e);
        }
    }

}
