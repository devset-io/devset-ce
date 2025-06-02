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
import io.devset.ce.kafka.dto.KafkaTopicDto;
import io.devset.ce.kafka.ui.dialogs.KafkaPresetDialog;
import javafx.fxml.FXML;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class KafkaTopicsController {

    private final KafkaFacade kafkaFacade;

    @FXML
    private TableView<KafkaTopicDto> topicTable;
    @FXML
    private TableColumn<KafkaTopicDto, String> nameCol;
    @FXML
    private TableColumn<KafkaTopicDto, Integer> partitionsCol;
    @FXML
    private TableColumn<KafkaTopicDto, Integer> replicationCol;
    @FXML
    private TableColumn<KafkaTopicDto, String> cleanupCol;
    @FXML
    private TableColumn<KafkaTopicDto, Long> retentionCol;
    @FXML
    private TableColumn<KafkaTopicDto, Void> actionsCol;

    private KafkaTopicsSceneService service;

    @FXML
    public void initialize() {
        this.service = new KafkaTopicsSceneService(topicTable, nameCol, partitionsCol, replicationCol, cleanupCol, retentionCol, actionsCol);
        service.buildTable();
        service.inputData(kafkaFacade.getAllTopics());
        service.buildTableButtons(this::onEdit, this::onDelete);
    }

    @FXML
    public void addTopic() {
        KafkaPresetDialog
                .showDialog(null)
                .ifPresent(kafkaFacade::saveTopic);
        service.inputData(kafkaFacade.getAllTopics());
    }

    void onEdit(KafkaTopicDto topic) {

    }


    void onDelete(KafkaTopicDto topic) {

    }

}
