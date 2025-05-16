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

package io.devset.ce.flows.dto;

import io.devset.ce.common.Provider;
import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.common.RuleDto;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.*;

@Getter
@AllArgsConstructor
public class FlowDefinitionDto {
    private String id;
    @Setter
    private String name;
    @Setter
    private Provider provider;
    @Setter(AccessLevel.PRIVATE)
    private List<FlowNodeDto> nodes;
    private List<FlowConnectionDto> connections;
    private Map<String, RuleDto> rules; // NodeId / schema
    private ProviderMetaData providerMetadata;

    public void addRule(String SchemaId, RuleDto rule) {
        this.rules.put(SchemaId, rule);
    }

    public Optional<RuleDto> getRule(String nodeId) {
        return Optional.ofNullable(rules.get(nodeId));
    }

    public void addNode(FlowNodeDto nodes) {
        this.nodes.add(nodes);
    }

    public void removeNodes(FlowNodeDto node) {
        var filteredNodes = this.nodes.stream().filter(it -> it.getId().equals(node.getId())).toList();
        setNodes(filteredNodes);
    }

    public Optional<FlowNodeDto> findNode(String id) {
        return nodes.stream().filter(it -> it.getId().equals(id)).findFirst();
    }

    public void addConnection(String from, String to) {
        connections.add(new FlowConnectionDto(UUID.randomUUID().toString(), from, to));
    }

    public boolean hasConnection(String from) {
        return connections.stream().anyMatch(it -> it.getSourceId().equals(from));
    }

    public boolean isConnection(String to) {
        return connections.stream().anyMatch(it -> it.getTargetId().equals(to));
    }
}
