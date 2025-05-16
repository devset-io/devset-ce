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

package io.devset.ce.kafka.ui;

public enum KafkaViews {

    KAFKA_MAIN("KafkaMainView"), KAFKA_SCHEMA("KafkaSchemaView"), KAFKA_TOPICS("KafkaTopicsView");
    private final String MAIN_PATH = "kafka";
    private final String name;

    KafkaViews(String name) {
        this.name = name;
    }

    public String getPath() {
        return String.format("%s/%s", MAIN_PATH, name);
    }
}
