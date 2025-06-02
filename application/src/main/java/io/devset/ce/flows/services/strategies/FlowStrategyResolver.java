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

package io.devset.ce.flows.services.strategies;

import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.common.RuleDto;
import io.devset.ce.flows.FlowElement;
import io.devset.ce.flows.services.strategies.impl.LoopStrategy;
import io.devset.ce.flows.services.strategies.impl.SingleSendStrategy;
import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.schemas.dto.SchemaDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FlowStrategyResolver {

    private final KafkaFacade kafkaFacade;

    public AbstractFlowStrategy resolve(KafkaFacade kafkaFacade, SchemaDto schema, ProviderMetaData providerMetaData, RuleDto rule, int tickIntervalMs) {
        FlowElement type = rule.getFlowElement();

        var context = new FlowWorkerContext(schema, providerMetaData, rule, tickIntervalMs, kafkaFacade);
        return switch (type) {
            case SCHEMA -> null;
            case PROCESSOR -> null;
            case LOOP_SENDER -> new LoopStrategy(context);
            case SINGLE_SENDER -> new SingleSendStrategy(context);
            case CONDITION -> null;
        };
    }
}
