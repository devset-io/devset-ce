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

package io.devset.ce.kafka.mappers;

import io.devset.ce.kafka.KafkaConfig;
import io.devset.ce.kafka.KafkaMessage;
import io.devset.ce.kafka.KafkaTopic;
import io.devset.ce.kafka.KafkaTopicDefinition;
import io.devset.ce.kafka.dto.KafkaConnectDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import io.devset.ce.kafka.dto.KafkaTopicDto;
import io.devset.ce.kafka.dto.NewKafkaTopicDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface KafkaMapper {

    KafkaConfig mapToDomain(KafkaConnectDto kafkaConnectDto);

    KafkaTopicDefinition mapToDomain(NewKafkaTopicDto kafkaConnectDto);

    @Mapping(target = "topic", source = "messageConfiguration.topic")
    @Mapping(target = "key", source = "messageConfiguration.key")
    @Mapping(target = "headers", source = "messageConfiguration.headers")
    KafkaMessage mapToDomain(KafkaMessageDto kafkaConnectDto);

    KafkaTopicDto mapToDomain(KafkaTopic domian);
}
