/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.util.LogSanitizer;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import io.devset.ce.be.rabbit.application.dto.RabbitConnectionStatusDto;
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.net.URLEncoder;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * Infrastructure adapter implementing dynamic RabbitMQ producer management.
 * <p>
 * Manages per-connection {@link RabbitTemplate} instances backed by {@link CachingConnectionFactory}.
 * Connections are stored in-memory and can be created, reused, or removed at runtime.
 * Overwriting or removing a connection is blocked when active execution plan runs reference it.
 * All connections are destroyed on application shutdown via {@code @PreDestroy}.
 */
@Component
@Slf4j
public class DynamicRabbitProducerManagerImpl implements DynamicRabbitProducerManager {

    private static final int DEFAULT_PORT = 5672;
    private static final int DEFAULT_MANAGEMENT_PORT = 15672;
    private static final Duration MANAGEMENT_CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration MANAGEMENT_READ_TIMEOUT = Duration.ofSeconds(5);
    private static final String DEFAULT_VIRTUAL_HOST = "/";

    private final ExecutionPlanRunService runService;
    private final Map<String, RabbitTemplate> producers = new ConcurrentHashMap<>();
    private final Map<String, ConnectionConfig> connections = new ConcurrentHashMap<>();
    private final RabbitMessageSender messageSender = new RabbitMessageSender(producers);

    DynamicRabbitProducerManagerImpl(ExecutionPlanRunService runService) {
        this.runService = runService;
    }

    @Override
    public void connect(
            String name,
            String host,
            @Nullable Integer port,
            @Nullable String virtualHost,
            @Nullable String username,
            @Nullable String password
    ) {
        if (host == null || host.isBlank()) {
            throw new WorkflowEngineException("RabbitMQ host must not be blank");
        }

        int output = port == null ? DEFAULT_PORT : port;
        if (output <= 0) {
            throw new WorkflowEngineException("RabbitMQ port must be > 0");
        }

        String input = virtualHost == null || virtualHost.isBlank() ? DEFAULT_VIRTUAL_HOST : virtualHost;
        ConnectionConfig state = new ConnectionConfig(host, output, input, username, password);
        ConnectionConfig object = connections.get(name);

        if (state.equals(object) && producers.containsKey(name)) {
            log.debug("RabbitMQ connection already exists and will be reused: name={}", name);
            return;
        }
        if (object != null && runService.hasActiveRunUsingConnector(ConnectionType.RABBIT, name)) {
            throw new WorkflowEngineException("Cannot overwrite RabbitMQ connector while active runs use it: " + name);
        }

        closeProducer(name);
        createProducer(name, state);
        connections.put(name, state);
    }

    @Override
    public void remove(String name) {
        if (!connections.containsKey(name)) {
            throw new WorkflowEngineException("RabbitMQ connector not found: " + name);
        }
        if (runService.hasActiveRunUsingConnector(ConnectionType.RABBIT, name)) {
            throw new WorkflowEngineException("Cannot remove RabbitMQ connector while active runs use it: " + name);
        }

        closeProducer(name);
        connections.remove(name);
    }

    @Override
    public List<RabbitConnectionStatusDto> listConnections() {
        return connections.entrySet()
                .stream()
                .map(entry -> {
                    ConnectionConfig object = entry.getValue();
                    return new RabbitConnectionStatusDto(
                            entry.getKey(),
                            object.endpoint(),
                            producers.containsKey(entry.getKey()),
                            false,
                            object.authenticated()
                    );
                })
                .sorted(java.util.Comparator.comparing(RabbitConnectionStatusDto::name))
                .toList();
    }

    @Override
    public RabbitBrokerResourcesDto listBrokerResources(String connectionName) {
        ConnectionConfig config = connections.get(connectionName);
        if (config == null) {
            throw new WorkflowEngineException("RabbitMQ connector not found: " + connectionName);
        }

        String encodedVhost = URLEncoder.encode(config.virtualHost(), UTF_8);
        String baseUrl = "http://" + config.host() + ":" + DEFAULT_MANAGEMENT_PORT;

        try {
            RestClient client = buildManagementClient(baseUrl, config);

            List<JsonNode> queuesJson = client.get()
                    .uri(URI.create(baseUrl + "/api/queues/" + encodedVhost))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            List<JsonNode> exchangesJson = client.get()
                    .uri(URI.create(baseUrl + "/api/exchanges/" + encodedVhost))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            List<String> queues = extractNames(queuesJson, name -> true);
            List<String> exchanges = extractNames(exchangesJson, name -> !name.isEmpty());

            return new RabbitBrokerResourcesDto(true, queues, exchanges);
        } catch (ResourceAccessException e) {
            log.warn("RabbitMQ Management API unreachable for connection '{}': {}", LogSanitizer.sanitize(connectionName), e.getMessage());
            return RabbitBrokerResourcesDto.unavailable();
        } catch (RestClientException e) {
            log.warn("RabbitMQ Management API error for connection '{}': {}", LogSanitizer.sanitize(connectionName), e.getMessage());
            return RabbitBrokerResourcesDto.unavailable();
        }
    }

    @Override
    public void sendMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            String message
    ) {
        messageSender.sendMessage(producerName, queueName, exchange, routingKey, message);
    }

    @Override
    public void sendBinaryMessage(
            String producerName,
            @Nullable String queueName,
            @Nullable String exchange,
            @Nullable String routingKey,
            byte[] message,
            @Nullable String contentType
    ) {
        messageSender.sendBinaryMessage(producerName, queueName, exchange, routingKey, message, contentType);
    }

    private void createProducer(String name, ConnectionConfig input) {
        CachingConnectionFactory output = new CachingConnectionFactory(input.host(), input.port());
        output.setVirtualHost(input.virtualHost());
        if (input.authenticated()) {
            output.setUsername(input.username());
            output.setPassword(input.password());
        }

        RabbitTemplate object = new RabbitTemplate(output);
        producers.put(name, object);
    }

    private void closeProducer(String name) {
        RabbitTemplate object = producers.remove(name);
        if (object == null) {
            return;
        }
        if (object.getConnectionFactory() instanceof CachingConnectionFactory output) {
            output.destroy();
        }
    }

    private static List<String> extractNames(@Nullable List<JsonNode> nodes, Predicate<String> filter) {
        if (nodes == null) {
            return List.of();
        }
        return nodes.stream()
                .map(node -> node.get("name").asText())
                .filter(filter)
                .sorted()
                .toList();
    }

    private RestClient buildManagementClient(String baseUrl, ConnectionConfig config) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(MANAGEMENT_CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(MANAGEMENT_READ_TIMEOUT);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory);
        if (config.authenticated()) {
            builder.requestInterceptor(new BasicAuthenticationInterceptor(config.username(), config.password()));
        }
        return builder.build();
    }

    @PreDestroy
    void closeAll() {
        List<String> state = producers.keySet().stream().toList();
        for (String object : state) {
            closeProducer(object);
        }
    }

    private record ConnectionConfig(
            String host,
            int port,
            String virtualHost,
            @Nullable String username,
            @Nullable String password
    ) {
        boolean authenticated() {
            return username != null && !username.isBlank() && password != null && !password.isBlank();
        }

        String endpoint() {
            return host + ":" + port + virtualHost;
        }
    }
}
