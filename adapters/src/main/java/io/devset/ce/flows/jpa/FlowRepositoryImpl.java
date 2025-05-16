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

import io.devset.ce.flows.Flow;
import io.devset.ce.flows.FlowDefinition;
import io.devset.ce.flows.FlowRepository;
import io.devset.ce.flows.FlowRule;
import io.devset.ce.flows.jpa.entities.FlowRuleEntity;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class FlowRepositoryImpl implements FlowRepository {

    private final FlowJpaRepository flowJpaRepository;
    private final FlowRuleEntityJpaRepository numericFieldRuleJpaRepository;
    private final FlowJpaMapper mapper;

    @Override
    public void save(FlowDefinition state) {
        var entity = mapper.toEntity(state);
        flowJpaRepository.save(entity);
        state.getRules().forEach((nodeId, v) -> {
            numericFieldRuleJpaRepository.save(
                    new FlowRuleEntity(
                            v.getId(),
                            entity.getId(),
                            nodeId,
                            v.getSchemaId(),
                            v.getGlobalTickMillis(),
                            v.getRules().stream().map(el -> mapper.toEntity(el, v.getId())).toList()
                    ));
        });
    }

    @Override
    @Transactional
    public void delete(String id) {
        this.flowJpaRepository.deleteById(id);
        this.numericFieldRuleJpaRepository.deleteByFlowDefinitionId(id);
    }

    @Override
    public List<Flow> getAll() {
        return flowJpaRepository.findAll().stream().map(mapper::toFlow).toList();
    }

    @Override
    public FlowDefinition getById(String id) {
        var flow = flowJpaRepository.findById(id).orElseThrow();
        var rules = numericFieldRuleJpaRepository.findByFlowDefinitionId(flow.getId())
                .stream()
                .collect(
                        Collectors.toMap(
                                FlowRuleEntity::getNodeId,
                                rule -> new FlowRule(rule.getId(), rule.getSchemaId(), rule.getGlobalTickMillis(),
                                        rule.getNumericFieldRules().stream().map(mapper::toDomain).toList()

                                )
                        )
                );

        return mapper.toDomain(flow, rules);
    }
}
