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

package io.devset.ce.flows.services.strategies.impl;

import io.devset.ce.flows.providers.KafkaMataData;
import io.devset.ce.flows.services.strategies.AbstractFlowStrategy;
import io.devset.ce.flows.services.strategies.FlowWorkerContext;
import io.devset.ce.kafka.dto.KafkaMessageConfigurationDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import lombok.extern.slf4j.Slf4j;

import static io.devset.ce.flows.services.strategies.impl.StrategyUtils.generateData;

@Slf4j
public class LoopStrategy extends AbstractFlowStrategy {

    public LoopStrategy(FlowWorkerContext context) {
        super(context);
    }

    @Override
    public boolean execute() {

        var hasIncrementedValue = context.getRule().getRules().stream().filter(it -> it.getRepetitions() >= context.getIteration()).findFirst();
        if (hasIncrementedValue.isEmpty()) {
            log.info("[UI] Iteration reached repetition limit, exiting worker");
            return false;
        }
        log.info("[UI] Iteration [{}] worker ", context.getIteration());
        var payload = generateData(context.getSchema().getPayload(), context.getRule(), context.getIteration());

        switch (context.getProviderMetaData()) {
            case KafkaMataData kafkaMeta -> context.getKafkaFacade().sendMsg(new KafkaMessageDto(
                    payload,
                    new KafkaMessageConfigurationDto(kafkaMeta.getTopic(), null, kafkaMeta.getHeaders(context.getRule().getId()))
            ));
            default ->
                    throw new IllegalArgumentException("Unsupported provider metadata type: " + context.getProviderMetaData().getClass());
        }
        context.increaseIteration();
        return true;
    }
}
