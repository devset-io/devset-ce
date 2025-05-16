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

package io.devset.ce.kafka.services;

import io.devset.ce.kafka.events.KafkaConnectResults;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Log4j2
@RequiredArgsConstructor
class KafkaConnectionMonitor {

    private final Map<String, String> monitoredConnections = new ConcurrentHashMap<>();
    private final ApplicationEventPublisher applicationEventPublisher;

    void startMonitoring(String configId, String bootstrapServers) {
        monitoredConnections.put(configId, bootstrapServers);
        log.info("Started Kafka monitoring for [{}] -> {}", configId, bootstrapServers);
        checkKafkaConnections();
    }

    void stopMonitoring(String configId) {
        if (monitoredConnections.remove(configId) != null) {
            log.info("Stopped Kafka monitoring for [{}]", configId);
        } else {
            log.warn("No active Kafka monitoring found for [{}]", configId);
        }
        applicationEventPublisher.publishEvent(new KafkaConnectResults(this, KafkaConnectResults.Result.FAILED));
    }

    @Scheduled(fixedDelay = 10000)
    public void checkKafkaConnections() {
        for (Map.Entry<String, String> entry : monitoredConnections.entrySet()) {
            String configId = entry.getKey();
            String bootstrapServers = entry.getValue();
            boolean healthy = isKafkaReachable(bootstrapServers);
            if (healthy) {
                log.info("Kafka [{}] is healthy at {}", configId, bootstrapServers);
                applicationEventPublisher.publishEvent(new KafkaConnectResults(this, KafkaConnectResults.Result.SUCCESS));
            } else {
                stopMonitoring(configId);
                log.warn("Kafka [{}] is unreachable at {}", configId, bootstrapServers);
            }
        }
    }

    private boolean isKafkaReachable(String bootstrapServers) {
        Properties props = new Properties();

        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, "3000");

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            producer.metrics();
            return true;
        } catch (Exception e) {
            log.debug("Kafka unreachable at {}: {}", bootstrapServers, e.getMessage());
            return false;
        }
    }
}
