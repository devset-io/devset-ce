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

package io.devset.ce.flows.services;

import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.common.RuleDto;
import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.schemas.SchemaFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
public class FlowWorkerManager {

    private final KafkaFacade kafkaFacade;
    private final SchemaFacade schemaFacade;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final Map<String, FlowWorker> workers = new ConcurrentHashMap<>();

    public void startWorker(String id, ProviderMetaData providerMetaData, RuleDto rules, int tickIntervalMs) {
        if (workers.containsKey(id)) return;
        var schema = schemaFacade.findById(rules.getSchemaId());
        FlowWorker worker = new FlowWorker(id, providerMetaData, schema, rules, tickIntervalMs, kafkaFacade);
        workers.put(id, worker);
        executor.submit(worker);
    }

    public void stopWorker(String id) {
        FlowWorker worker = workers.remove(id);
        if (worker != null) {
            worker.stop();
        }
    }

    public void stopAll() {
        workers.values().forEach(FlowWorker::stop);
        workers.clear();
    }

    public Set<String> getActiveWorkerIds() {
        return workers.keySet();
    }

    public boolean isRunning(String id) {
        return workers.containsKey(id);
    }
}
