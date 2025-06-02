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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.kafka.*;
import io.devset.ce.kafka.events.KafkaConnectResults;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.common.config.ConfigResource;
import org.apache.kafka.common.errors.TopicExistsException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class KafkaServiceImpl implements KafkaService {
    private final ObjectMapper objectMapper;
    private final KafkaProducerRegistry kafkaConnector;
    private final KafkaConnectionMonitor kafkaConnectionMonitor;
    private final Map<String, KafkaTemplate<String, String>> producers = new HashMap<>();
    private final Map<String, String> bootstrapServers = new HashMap<>();

    private final String configId = "1";

    @Override
    public void connect(KafkaConfig kafkaConfig) {
        try {
            var producer = kafkaConnector.createKafkaTemplate(kafkaConfig.bootstrapServers(), true);
            producers.put(configId, producer);
            bootstrapServers.put(configId, kafkaConfig.bootstrapServers());
            log.info("Connected [{}] to Kafka at: {}", configId, kafkaConfig.bootstrapServers());
            kafkaConnectionMonitor.startMonitoring(configId, kafkaConfig.bootstrapServers());
        } catch (Exception e) {
            log.error("Kafka connection failed for [{}]: {}", configId, e.getMessage(), e);
        }
    }

    @Override
    public void disconnect() {
        var producer = producers.get(configId);
        producer.destroy();
        producers.remove(configId);
        kafkaConnectionMonitor.stopMonitoring(configId);
    }

    @Override
    public void createTopic(KafkaTopicDefinition kafkaConfig) {
        String bootstrap = bootstrapServers.get(configId);
        if (bootstrap == null) throw new IllegalStateException("Not connected: " + configId);

        Properties config = new Properties();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);

        NewTopic topic = new NewTopic(kafkaConfig.topic(), kafkaConfig.partitions(), (short) kafkaConfig.replicationFactor());

        try (AdminClient admin = AdminClient.create(config)) {
            admin.createTopics(List.of(topic)).all().get();
            log.info("Kafka topic created: {} on [{}]", kafkaConfig.topic(), configId);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof TopicExistsException) {
                log.info("Kafka topic already exists: {} on [{}]", kafkaConfig.topic(), configId);
            } else {
                log.error("Failed to create topic: {} on [{}]", kafkaConfig.topic(), configId, e);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Topic creation interrupted for: {} on [{}]", kafkaConfig.topic(), configId);
        }
    }

    @Override
    @CacheEvict(value = {"kafka-topics"}, allEntries = true, beforeInvocation = false)
    public List<KafkaTopic> refreshTopics() {
        return getKafkaTopicsImpl();
    }

    @Override
    @Cacheable("kafka-topics")
    public List<KafkaTopic> getAllTopics() {
        return getKafkaTopicsImpl();
    }

    private List<KafkaTopic> getKafkaTopicsImpl() {
        String bootstrap = bootstrapServers.get(configId);
        if (bootstrap == null) throw new IllegalStateException("Not connected: " + configId);

        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);

        try (AdminClient adminClient = AdminClient.create(props)) {
            Set<String> topicNames = adminClient.listTopics().names().get();

            Map<String, TopicDescription> descriptions = adminClient.describeTopics(topicNames).all().get();
            List<ConfigResource> resources = topicNames.stream()
                    .map(name -> new ConfigResource(ConfigResource.Type.TOPIC, name))
                    .toList();
            Map<ConfigResource, Config> configs = adminClient.describeConfigs(resources).all().get();

            List<KafkaTopic> response = new ArrayList<>();
            for (String name : topicNames) {
                TopicDescription desc = descriptions.get(name);
                Config config = configs.get(new ConfigResource(ConfigResource.Type.TOPIC, name));

                int partitions = desc.partitions().size();
                int replication = desc.partitions().get(0).replicas().size();
                String cleanup = getConfigValue(config, "cleanup.policy", "delete");
                long retention = Long.parseLong(getConfigValue(config, "retention.ms", "604800000"));

                response.add(new KafkaTopic(name, partitions, replication, cleanup, retention));
            }
            return response;

        } catch (Exception e) {
            throw new RuntimeException("Kafka metadata fetch failed for: " + configId, e);
        }
    }

    @Override
    public void send(KafkaMessage values) {
        try {
            Map<String, Object> obj = objectMapper.readValue(values.payload(), new TypeReference<Map<String, Object>>() {
            });

            var builder = MessageBuilder.withPayload(obj)
                    .setHeader(KafkaHeaders.TOPIC, values.topic());

            if (values.headers() != null) {
                values.headers().forEach(builder::setHeader);
            }

            var message = builder.build();

            KafkaTemplate<String, String> template = producers.get(configId);
            if (template == null) {
                log.error("[UI] Failed to send message [{}] to Kafka [{}], No KafkaTemplate", values, configId);
                throw new IllegalStateException("No KafkaTemplate for: " + configId);
            }

            template.send(message);
            log.info("Message sent to Kafka topic: {} with : ", values.topic());
        } catch (Exception e) {
            log.error("[UI] Failed to send message [{}] to Kafka [{}]", values, configId);
            log.error("Failed to send Kafka message", e);
        }
    }

    private String getConfigValue(Config config, String key, String defaultVal) {
        ConfigEntry entry = config.get(key);
        return entry != null && entry.value() != null ? entry.value() : defaultVal;
    }
}
