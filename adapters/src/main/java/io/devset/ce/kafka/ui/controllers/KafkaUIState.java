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

package io.devset.ce.kafka.ui.controllers;


import io.devset.ce.kafka.dto.KafkaConnectDto;
import io.devset.ce.kafka.dto.KafkaMessageConfigurationDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import lombok.Getter;

import java.util.Map;

class KafkaUIState {

    private static volatile KafkaUIState instance;
    private boolean isConnected;
    @Getter
    private KafkaConnectDto connectDto;

    private KafkaUIState(KafkaConnectDto connectDto) {
        this.connectDto = connectDto;
    }

    static KafkaUIState getInstance() {
        if (instance == null) {
            synchronized (KafkaUIState.class) {
                if (instance == null) {
                    instance = new KafkaUIState(new KafkaConnectDto("localhost", 29092, null, null));
                }
            }
        }
        return instance;
    }

    synchronized void setConnected(boolean connected) {
        this.isConnected = connected;
    }

    synchronized boolean isConnected() {
        return isConnected;
    }

    public void setConnectedData(KafkaConnectDto connectDto) {
        this.connectDto = connectDto;
    }
}
