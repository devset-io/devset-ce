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
import io.devset.ce.schemas.dto.SchemaDto;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaSchemaController {

    private final KafkaFacade kafkaFacade;

    @FXML
    private TextArea jsonTextArea;
    @FXML
    private ListView<SchemaDto> schemasListView;
    @FXML
    private TextField schemaNameField;
    private ObservableList<SchemaDto> observableSchemas = FXCollections.observableArrayList();
    private SchemaDto selectedSchema;

    @FXML
    public void initialize() {
        fetchSchemaLists();
        selectSchemaFromList();
    }

    @FXML
    void formatInput() {
        var json = kafkaFacade.formatInput(jsonTextArea.getText());
        jsonTextArea.setText(json);
    }

    @FXML
    void save() {
        if (Objects.isNull(selectedSchema)) {
            crateNew();
        } else {
            update();
        }
    }

    @FXML
    void addNew() {
        if (!Objects.isNull(selectedSchema)) {
            this.selectedSchema = null;
        }
        jsonTextArea.clear();
        schemaNameField.clear();
    }

    @FXML
    void delete() {
        if (!Objects.isNull(selectedSchema)) {
            this.kafkaFacade.deleteSchema(selectedSchema);
            this.selectedSchema = null;
        }
        fetchSchemaLists();
        jsonTextArea.clear();
        schemaNameField.clear();
    }

    private void fetchSchemaLists() {
        List<SchemaDto> schemas = kafkaFacade.findSchemas();
        observableSchemas = FXCollections.observableArrayList(schemas);
        schemasListView.setItems(observableSchemas);
        schemasListView.setCellFactory(param -> new ListCell<>() {
            @Override
            protected void updateItem(SchemaDto item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : String.format("%s (%s)", item.getName(), item.getType()));
            }
        });
    }

    private void selectSchemaFromList() {
        schemasListView.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal != null) {
                selectedSchema = newVal;
                schemaNameField.setText(newVal.getName());
                jsonTextArea.setText(newVal.getPayload());
            }
        });
    }

    private void update() {
        kafkaFacade.update(this.selectedSchema.getId(), this.schemaNameField.getText(), this.jsonTextArea.getText());
        fetchSchemaLists();
    }

    private void crateNew() {
        if (schemaNameField.getText().isEmpty()) {
            throw new IllegalArgumentException("Schema name cannot be empty");
        }
        var element = kafkaFacade.saveSchema(schemaNameField.getText(), jsonTextArea.getText());
        observableSchemas.add(element);
    }
}
