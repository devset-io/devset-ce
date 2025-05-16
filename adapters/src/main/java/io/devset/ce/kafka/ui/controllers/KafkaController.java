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

import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.kafka.dto.KafkaMessageConfigurationDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class KafkaController {

    private final KafkaFacade kafkaFacade;
    private final KafkaUIState kafkaUIState;

    public KafkaController(KafkaFacade kafkaFacade) {
        this.kafkaFacade = kafkaFacade;
        this.kafkaUIState = KafkaUIState.getInstance();
    }

    @FXML
    public void initialize() {

    }


}
