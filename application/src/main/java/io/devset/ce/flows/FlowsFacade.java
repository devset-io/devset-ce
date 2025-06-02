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

import io.devset.ce.common.Provider;
import io.devset.ce.flows.dto.FlowDefinitionDto;
import io.devset.ce.flows.dto.FlowDto;
import io.devset.ce.flows.providers.KafkaMataData;
import io.devset.ce.flows.services.FlowWorkerManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class FlowsFacade {

    private final FlowWorkerManager flowWorkerManager;
    private final FlowMapper flowMapper;
    private final FlowRepository flowRepository;

    public void startFlows(FlowDefinitionDto flow) {
        flow.getRules().forEach((key, value) -> flowWorkerManager.startWorker(UUID.randomUUID().toString(), flow.getProviderMetadata(), value, 1000));
    }

    public void saveFlow(FlowDefinitionDto state) {
        var domain = flowMapper.toDomain(state);
        flowRepository.save(domain);
    }

    public List<FlowDto> getNames() {
        return flowRepository.getAll().stream().map(flowMapper::toDto).collect(Collectors.toList());
    }

    public FlowDefinitionDto getById(String id) {
        var domain = flowRepository.getById(id);
        return flowMapper.toDto(domain);
    }

    public FlowDefinitionDto createFlow() {
        var dto = new FlowDefinitionDto(UUID.randomUUID().toString(), "Flow Definition", Provider.KAFKA, new ArrayList<>(), new ArrayList<>(), new HashMap<>(), new KafkaMataData("", Map.of()));
        flowRepository.save(flowMapper.toDomain(dto));
        return dto;
    }

    public void stopFlows() {
        flowWorkerManager.stopAll();
    }

    public void delete(String id) {
        flowRepository.delete(id);
    }
}
