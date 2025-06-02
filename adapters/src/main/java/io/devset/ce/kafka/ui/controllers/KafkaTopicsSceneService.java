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

import io.devset.ce.kafka.dto.KafkaTopicDto;
import javafx.beans.property.SimpleIntegerProperty;
import javafx.beans.property.SimpleLongProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.scene.control.Button;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.layout.HBox;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.function.Consumer;

@Slf4j
class KafkaTopicsSceneService {

    private final TableView<KafkaTopicDto> topicTable;
    private final TableColumn<KafkaTopicDto, String> nameCol;
    private final TableColumn<KafkaTopicDto, Integer> partitionsCol;
    private final TableColumn<KafkaTopicDto, Integer> replicationCol;
    private final TableColumn<KafkaTopicDto, String> cleanupCol;
    private final TableColumn<KafkaTopicDto, Long> retentionCol;
    private final TableColumn<KafkaTopicDto, Void> actionsCol;

    public KafkaTopicsSceneService(TableView<KafkaTopicDto> topicTable, TableColumn<KafkaTopicDto, String> nameCol, TableColumn<KafkaTopicDto, Integer> partitionsCol, TableColumn<KafkaTopicDto, Integer> replicationCol, TableColumn<KafkaTopicDto, String> cleanupCol, TableColumn<KafkaTopicDto, Long> retentionCol, TableColumn<KafkaTopicDto, Void> actionsCol) {
        this.topicTable = topicTable;
        this.nameCol = nameCol;
        this.partitionsCol = partitionsCol;
        this.replicationCol = replicationCol;
        this.cleanupCol = cleanupCol;
        this.retentionCol = retentionCol;
        this.actionsCol = actionsCol;
    }

    void buildTable() {
        nameCol.setCellValueFactory(data -> new SimpleStringProperty(data.getValue().getName()));
        partitionsCol.setCellValueFactory(data -> new SimpleIntegerProperty(data.getValue().getPartitions()).asObject());
        replicationCol.setCellValueFactory(data -> new SimpleIntegerProperty(data.getValue().getReplication()).asObject());
        cleanupCol.setCellValueFactory(data -> new SimpleStringProperty(data.getValue().getCleanupPolicy()));
        retentionCol.setCellValueFactory(data -> new SimpleLongProperty(data.getValue().getRetentionMs()).asObject());
        topicTable.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        nameCol.setMaxWidth(1f * Integer.MAX_VALUE * 30);
        partitionsCol.setMaxWidth(1f * Integer.MAX_VALUE * 10);
        replicationCol.setMaxWidth(1f * Integer.MAX_VALUE * 10);
        cleanupCol.setMaxWidth(1f * Integer.MAX_VALUE * 15);
        retentionCol.setMaxWidth(1f * Integer.MAX_VALUE * 15);
        actionsCol.setMaxWidth(1f * Integer.MAX_VALUE * 20);
    }

    void inputData(List<KafkaTopicDto> allTopics) {
        topicTable.setItems(FXCollections.observableArrayList(allTopics));
    }

    public void buildTableButtons(Consumer<KafkaTopicDto> onEdit, Consumer<KafkaTopicDto> onDelete) {
        var actionsCol = new TableColumn<KafkaTopicDto, Void>("Actions");

        actionsCol.setCellFactory(col -> new TableCell<>() {
            private final Button editBtn = new Button("Edit");
            private final Button deleteBtn = new Button("Delete");
            private final HBox container = new HBox(5, editBtn, deleteBtn);

            {
                editBtn.setOnAction(e -> {
                    KafkaTopicDto item = getTableView().getItems().get(getIndex());
                    onEdit.accept(item);
                });
                deleteBtn.setOnAction(e -> {
                    KafkaTopicDto item = getTableView().getItems().get(getIndex());
                    onDelete.accept(item);
                });
            }

            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : container);
            }
        });

        topicTable.getColumns().add(actionsCol);
    }
}
